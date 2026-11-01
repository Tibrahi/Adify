// npm run email:test -- --to=someone@example.com — send ONE real test email.
// Refuses to run without an explicit recipient. Never used by builds/migrations.
import nodemailer from 'nodemailer';
import { argValue, fail, loadEnv, ok, smtpConfig } from './lib.mjs';

loadEnv();

const to = (argValue('to') || process.env.EMAIL_TEST_TO || '').trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
  fail('refusing to send: pass an explicit recipient, e.g. npm run email:test -- --to=you@example.com');
}
const { host, port, secure, user, pass, from } = smtpConfig();
if (!host || !Number.isInteger(port) || !user || !pass || !from) {
  fail('SMTP is not configured. Run npm run email:check first and fix the reported problems.');
}

try {
  const tx = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  const info = await tx.sendMail({
    from,
    to,
    subject: 'ADIFY email test',
    text: 'This is a requested ADIFY email test. If you received it, SMTP delivery works end to end.',
  });
  tx.close();
  ok(`test email accepted by SMTP (message ${info.messageId || 'id-unknown'}). Check the inbox AND spam folder of ${to}.`);
} catch (e) {
  fail(`test email failed: ${e.message}`);
}
