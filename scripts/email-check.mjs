// npm run email:check — validate SMTP configuration and connectivity.
// Sends nothing. Never prints secrets. Exits nonzero on any failure.
import nodemailer from 'nodemailer';
import { extractAddress, fail, loadEnv, ok, smtpConfig } from './lib.mjs';

loadEnv();
const problems = [];
const check = (name, cond, hint) => {
  if (cond) ok(name);
  else problems.push(hint ? `${name} — ${hint}` : name);
};

const { host, port, secure, user, pass, from, support } = smtpConfig();
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

check('SMTP_HOST set', Boolean(host), 'set SMTP_HOST=smtp.gmail.com in .env.local');
check('SMTP_PORT valid', Number.isInteger(port) && port > 0 && port < 65536, 'set SMTP_PORT=465');
check('SMTP_USER set', Boolean(user) && !/example\.com$/i.test(user), 'set SMTP_USER to the authorized Gmail address');
check('SMTP password set', pass.length >= 8, 'set SMTP_PASSWORD (or legacy SMTP_PASS) to a Google App Password — never a normal account password');
check('sender valid', Boolean(extractAddress(from)), 'set EMAIL_FROM (or legacy SMTP_FROM) to an address the SMTP account may send as');
if (support) check('SUPPORT_EMAIL valid', emailRe.test(support), 'fix or clear SUPPORT_EMAIL');

if (problems.length) {
  console.error('\nemail configuration INVALID:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`\ntransport: ${host}:${port} secure=${secure} user=${user} from=${from}`);
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
  await tx.verify();
  ok('SMTP connectivity + authentication verified (this proves the transport works, not that every future mail will inbox)');
  tx.close();
} catch (e) {
  fail(
    `SMTP verify failed: ${e.message}\n` +
      'Actionable next steps:\n' +
      '  - Confirm the Gmail account has 2-Step Verification and the App Password is current (16 chars, no spaces).\n' +
      '  - Confirm SMTP_USER matches the account that owns the App Password.\n' +
      '  - Confirm the network allows outbound TCP/465 (or 587 with SMTP_SECURE=false).\n' +
      '  - Check Google account security alerts for blocked sign-in attempts.',
  );
}
