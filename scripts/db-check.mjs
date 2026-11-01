// npm run db:check — validate DB configuration and Neon connectivity.
import { db, fail, loadEnv, ok, redactUrl } from './lib.mjs';

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) fail('DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Neon connection string.');
try {
  const u = new URL(url);
  if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') {
    fail(`DATABASE_URL must use the postgres:// scheme (got ${u.protocol}).`);
  }
  if (!u.hostname || !u.username) fail('DATABASE_URL is missing a host or username.');
  ok(`configuration present (${redactUrl(url)})`);
} catch (e) {
  if (String(e.message).startsWith('error:')) throw e;
  fail('DATABASE_URL is not a valid URL.');
}

try {
  const sql = await db();
  const rows = await sql.query('SELECT current_database() AS db, version() AS v', []);
  const version = String(rows[0].v).split(' ').slice(0, 2).join(' ');
  ok(`Neon PostgreSQL reachable (database ${rows[0].db}, ${version})`);
  await sql.query('SELECT 1', []);
  ok('readiness probe passed');
} catch (e) {
  fail(`cannot reach Neon PostgreSQL: ${e.message}\nCheck DATABASE_URL, network access, and that the Neon project is not suspended.`);
}
