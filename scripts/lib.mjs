// Shared helpers for ADIFY operational scripts (plain Node, no build step).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Minimal .env loader (.env.local wins, then .env). Never overrides real env.
export function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    for (const raw of fs.readFileSync(full, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const eq = line.indexOf('=');
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

// Canonical SMTP_PASSWORD/EMAIL_FROM plus legacy SMTP_PASS/SMTP_FROM aliases.
export function smtpConfig() {
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

// Accepts plain addresses and "Display Name <addr>" forms.
export function extractAddress(value) {
  const m = String(value || '').match(/<([^<>\s]+@[^<>\s]+)>\s*$/);
  if (m) return m[1];
  const v = String(value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : '';
}

export function redactUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '(unparseable URL)';
  }
}

export async function db() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Neon connection string.');
  }
  const { neon } = await import('@neondatabase/serverless');
  return neon(url);
}

// Migration files contain plain DDL/DML only (no functions, no dollar-quotes).
export function splitStatements(text) {
  return text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(/;\s*\n/)
    .map((s) => s.trim().replace(/;$/, '').trim())
    .filter((s) => s.length > 0);
}

export function ok(message) {
  console.log(`ok - ${message}`);
}

export function fail(message, code = 1) {
  console.error(`error: ${message}`);
  process.exit(code);
}

export function argValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

export function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}
