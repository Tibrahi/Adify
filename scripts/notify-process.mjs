// npm run notify:process — deliver due email_outbox jobs with bounded retries.
// Safe to run on a schedule and from multiple workers: each job is claimed
// atomically (single UPDATE ... RETURNING) so two workers never send it twice.
import nodemailer from 'nodemailer';
import { argValue, db, fail, loadEnv, smtpConfig } from './lib.mjs';

loadEnv();

const MAX_ATTEMPTS = 8;
const MAX_DELAY_SEC = 6 * 3600;

function backoffSec(attempts) {
  return Math.min(60 * 2 ** Math.max(0, attempts - 1), MAX_DELAY_SEC);
}

const limit = Math.min(Math.max(Number(argValue('limit') || 20), 1), 200);

const { host, port, secure, user, pass, from } = smtpConfig();
if (!host || !Number.isInteger(port) || !user || !pass || !from) {
  fail('SMTP is not configured — jobs stay queued. Run npm run email:check for details.');
}

const tx = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

try {
  const sql = await db();
  const due = await sql.query(
    `SELECT id FROM email_outbox
     WHERE status IN ('queued', 'retry') AND next_attempt_at <= NOW()
     ORDER BY next_attempt_at ASC LIMIT $1`,
    [limit],
  );
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of due) {
    // Atomic claim: only one worker can flip a due job to 'sending'.
    const claimed = await sql.query(
      `UPDATE email_outbox SET status = 'sending', attempts = attempts + 1
       WHERE id = $1 AND status IN ('queued', 'retry') AND next_attempt_at <= NOW()
       RETURNING id, recipient, subject, body_text, body_html, attempts`,
      [row.id],
    );
    if (claimed.length === 0) {
      skipped += 1;
      continue;
    }
    const job = claimed[0];
    try {
      await tx.sendMail({
        from,
        to: job.recipient,
        subject: job.subject,
        text: job.body_text || undefined,
        html: job.body_html || undefined,
      });
      await sql.query(
        `UPDATE email_outbox SET status = 'sent', last_error = '', sent_at = NOW() WHERE id = $1`,
        [job.id],
      );
      sent += 1;
      console.log(`sent: ${job.id} -> ${job.recipient}`);
    } catch (e) {
      const err = String(e?.message ?? e).slice(0, 300);
      if (job.attempts >= MAX_ATTEMPTS) {
        await sql.query(
          `UPDATE email_outbox SET status = 'failed', last_error = $2 WHERE id = $1`,
          [job.id, err],
        );
        failed += 1;
        console.log(`failed permanently: ${job.id} (${err})`);
      } else {
        const delay = backoffSec(job.attempts);
        await sql.query(
          `UPDATE email_outbox SET status = 'retry', last_error = $2, next_attempt_at = NOW() + ($3 || ' seconds')::interval WHERE id = $1`,
          [job.id, err, String(delay)],
        );
        failed += 1;
        console.log(`retry in ${delay}s: ${job.id} (${err})`);
      }
    }
  }
  tx.close();
  console.log(`done: ${sent} sent, ${failed} failed/retrying, ${skipped} claimed elsewhere, ${due.length} due.`);
  if (failed > 0) process.exitCode = 2;
} catch (e) {
  try {
    tx.close();
  } catch {
    // ignore
  }
  fail(e.message);
}
