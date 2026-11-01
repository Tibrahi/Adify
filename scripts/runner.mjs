// Migration engine shared by db:migrate (strict deploy path) and db:push
// (dev sync path). History-tracked, checksum-guarded, crash-safe:
// - completed + matching checksum -> skip (repeat runs are safe)
// - checksum mismatch -> abort loudly (never silently diverge)
// - failed -> abort with diagnosis (resolve, then clear the row to retry)
// - running + stale (>15 min) -> atomic takeover; else abort (concurrency)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, db, splitStatements } from './lib.mjs';

const BOOTSTRAP = `CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;

export function migrationFiles() {
  const dir = path.join(ROOT, 'migrations');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => {
      const text = fs.readFileSync(path.join(dir, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(text).digest('hex');
      return { file, text, checksum };
    });
}

export async function applyMigrations() {
  const sql = await db();
  await sql.query(BOOTSTRAP, []);
  const rows = await sql.query('SELECT filename, checksum, status, attempts FROM schema_migrations', []);
  const seen = new Map(rows.map((r) => [r.filename, r]));
  const report = [];

  for (const { file, text, checksum } of migrationFiles()) {
    const row = seen.get(file);
    if (row && row.checksum !== checksum) {
      throw new Error(
        `${file}: checksum mismatch — the file changed after being applied. ` +
          'Fix forward with a new migration instead of editing history.',
      );
    }
    if (row && row.status === 'completed') {
      report.push({ file, action: 'skipped (already applied)' });
      continue;
    }
    if (row && row.status === 'failed') {
      throw new Error(
        `${file}: previously failed. Inspect the error in schema_migrations, fix the cause, ` +
          `then DELETE FROM schema_migrations WHERE filename = '${file}' to retry. Aborting.`,
      );
    }
    if (row && row.status === 'running') {
      const claimed = await sql.query(
        `UPDATE schema_migrations SET status = 'running', attempts = attempts + 1, applied_at = NOW()
         WHERE filename = $1 AND status = 'running' AND applied_at < NOW() - INTERVAL '15 minutes'
         RETURNING filename`,
        [file],
      );
      if (claimed.length === 0) {
        throw new Error(
          `${file}: another migration process is running (or one crashed <15 min ago). Aborting to avoid conflicts.`,
        );
      }
    } else if (!row) {
      const inserted = await sql.query(
        `INSERT INTO schema_migrations (filename, checksum, status, attempts, applied_at)
         VALUES ($1, $2, 'running', 1, NOW())
         ON CONFLICT (filename) DO NOTHING RETURNING filename`,
        [file, checksum],
      );
      if (inserted.length === 0) {
        throw new Error(
          `${file}: claimed by a concurrent migration process. Aborting to avoid conflicts.`,
        );
      }
    }

    try {
      for (const stmt of splitStatements(text)) {
        await sql.query(stmt, []);
      }
      await sql.query(
        `UPDATE schema_migrations SET status = 'completed', checksum = $2, last_error = '', applied_at = NOW() WHERE filename = $1`,
        [file, checksum],
      );
      report.push({ file, action: 'applied' });
    } catch (err) {
      const message = String(err?.message ?? err).slice(0, 500);
      await sql.query(
        `UPDATE schema_migrations SET status = 'failed', last_error = $2, applied_at = NOW() WHERE filename = $1`,
        [file, message],
      );
      throw new Error(`${file}: migration failed and was recorded as failed. ${message}`);
    }
  }
  return report;
}
