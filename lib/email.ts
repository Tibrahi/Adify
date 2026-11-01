import nodemailer, { type Transporter } from 'nodemailer';
import { hasHeaderInjection } from './validate';
import {
  claimOutboxJob,
  createNotification,
  enqueueOutbox,
  markOutboxFailed,
  markOutboxRetry,
  markOutboxSent,
} from './repo';

// Central mail transport (Nodemailer + Google SMTP). Credentials come only
// from environment variables and never reach the browser.
//
// Delivery model: every email is first recorded as a durable outbox job
// (idempotent by key), then delivery is attempted. Failures leave the job
// queued for retry via `npm run notify:process` — product flows (bookings,
// events, tickets) never fail because SMTP is down, and nothing is ever
// silently pretended sent.

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  support: string;
}

// Canonical names are SMTP_PASSWORD/EMAIL_FROM/SUPPORT_EMAIL; the legacy
// aliases SMTP_PASS/SMTP_FROM are honored for existing deployments.
// App-password whitespace ("xxxx xxxx ...") is stripped automatically.
export function smtpConfig(): SmtpConfig {
  return {
    host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE ?? 'true').trim() !== 'false',
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    from: (process.env.EMAIL_FROM || process.env.SMTP_FROM || '').trim(),
    support: (process.env.SUPPORT_EMAIL || '').trim(),
  };
}

export function isSmtpConfigured(): boolean {
  const c = smtpConfig();
  return Boolean(c.host && Number.isInteger(c.port) && c.user && c.pass && c.from);
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const c = smtpConfig();
  transporter = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: c.pass },
  });
  return transporter;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(title: string, bodyHtml: string): string {
  return `<div style="font-family:Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;color:#171717">
<div style="font-weight:700;font-size:20px;margin-bottom:4px">ADIFY</div>
<div style="font-size:13px;color:#666666;margin-bottom:16px">Events and ceremonies across Africa</div>
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
<div style="font-size:14px;line-height:1.6">${bodyHtml}</div>
</div>`;
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export interface SendResult {
  delivered: boolean;
  error: string;
}

// Raw single delivery attempt. Returns the outcome; only header injection
// throws (a programming error, never a runtime delivery state).
export async function sendMail(input: MailInput): Promise<SendResult> {
  if (hasHeaderInjection(input.to) || hasHeaderInjection(input.subject)) {
    throw new Error('invalid_email_headers');
  }
  if (!isSmtpConfigured()) {
    return { delivered: false, error: 'smtp_not_configured' };
  }
  try {
    const tx = getTransporter();
    await tx.sendMail({
      from: smtpConfig().from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { delivered: true, error: '' };
  } catch (err) {
    return { delivered: false, error: errText(err) };
  }
}

export const OUTBOX_MAX_ATTEMPTS = 8;

export function outboxBackoffSec(attempts: number): number {
  return Math.min(60 * 2 ** Math.max(0, attempts - 1), 6 * 3600);
}

// Enqueue (idempotent by key) and attempt immediate delivery. Returns the
// durable outcome; never throws for delivery/availability reasons.
export async function sendTracked(input: MailInput & { key: string }): Promise<{
  jobId: string;
  delivered: boolean;
  status: string;
}> {
  if (hasHeaderInjection(input.to) || hasHeaderInjection(input.subject)) {
    throw new Error('invalid_email_headers');
  }
  let jobId = '';
  try {
    const job = await enqueueOutbox({
      key: input.key,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? '',
    });
    jobId = job.id;
    if (job.status === 'sent') return { jobId, delivered: true, status: 'sent' };
  } catch (err) {
    console.error('[adify] outbox enqueue failed:', err);
    return { jobId: '', delivered: false, status: 'enqueue_failed' };
  }
  if (!isSmtpConfigured()) {
    return { jobId, delivered: false, status: 'queued' };
  }
  return tryDeliverOutbox(jobId);
}

// Claim one job and attempt delivery. Safe under concurrency (atomic claim)
// and never throws: every outcome is recorded on the job.
export async function tryDeliverOutbox(jobId: string): Promise<{
  jobId: string;
  delivered: boolean;
  status: string;
}> {
  try {
    const job = await claimOutboxJob(jobId);
    if (!job) return { jobId, delivered: false, status: 'claimed_elsewhere' };
    const result = await sendMail({
      to: job.to,
      subject: job.subject,
      text: job.text,
      html: job.html,
    });
    if (result.delivered) {
      await markOutboxSent(job.id);
      return { jobId, delivered: true, status: 'sent' };
    }
    if (job.attempts >= OUTBOX_MAX_ATTEMPTS) {
      await markOutboxFailed(job.id, result.error);
      return { jobId, delivered: false, status: 'failed' };
    }
    await markOutboxRetry(job.id, result.error, outboxBackoffSec(job.attempts));
    return { jobId, delivered: false, status: 'retry' };
  } catch (err) {
    console.error('[adify] outbox delivery failed:', err);
    try {
      await markOutboxRetry(jobId, errText(err), 300);
    } catch {
      // job keeps its claimed state for the worker to recover
    }
    return { jobId, delivered: false, status: 'retry' };
  }
}

// Best-effort user notification: in-app record first, tracked email second.
// Never throws, so product flows never fail because of notifications.
export async function notifyUser(input: {
  userId: string;
  email: string;
  kind: string;
  title: string;
  body: string;
  link?: string;
  key: string;
  emailSubject?: string;
  emailHtml?: string;
}): Promise<void> {
  try {
    await createNotification({
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      link: input.link ?? '',
    });
  } catch (err) {
    console.error('[adify] notification record failed:', err);
  }
  try {
    await sendTracked({
      key: input.key,
      to: input.email,
      subject: input.emailSubject ?? input.title,
      text: `${input.title}\n\n${input.body}`,
      html: input.emailHtml ?? layout(input.title, `<p>${escapeHtml(input.body)}</p>`),
    });
  } catch (err) {
    console.error('[adify] notification email failed:', err);
  }
}

export function verificationEmail(code: string): { subject: string; text: string; html: string } {
  return {
    subject: 'Your ADIFY verification code',
    text: `Your ADIFY verification code is ${code}. It expires in 15 minutes. If you did not request it, ignore this message.`,
    html: layout(
      'Verify your email',
      `<p>Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${escapeHtml(code)}</p><p>It expires in 15 minutes.</p>`,
    ),
  };
}

export function resetEmail(link: string): { subject: string; text: string; html: string } {
  return {
    subject: 'Reset your ADIFY password',
    text: `Reset your ADIFY password with this link (expires in 30 minutes): ${link}`,
    html: layout(
      'Reset your password',
      `<p>Use the link below within 30 minutes:</p><p><a href="${escapeHtml(link)}">Reset password</a></p>`,
    ),
  };
}
