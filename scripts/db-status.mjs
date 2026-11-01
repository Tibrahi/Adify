// npm run db:status — connectivity, migration state, pending list, counts.
import { migrationFiles } from './runner.mjs';
import { db, fail, loadEnv, ok } from './lib.mjs';

loadEnv();

try {
  const sql = await db();
  const ping = await sql.query('SELECT current_database() AS db', []);
  ok(`connected to database ${ping[0].db}`);

  let history = [];
  try {
    history = await sql.query('SELECT filename, status, applied_at FROM schema_migrations ORDER BY filename', []);
  } catch {
    console.log('migration history: none yet (schema_migrations missing — run npm run db:migrate)');
  }
  const seen = new Map(history.map((r) => [r.filename, r]));
  const files = migrationFiles().map((m) => m.file);
  console.log('migrations:');
  for (const file of files) {
    const row = seen.get(file);
    console.log(`  - ${file}: ${row ? `${row.status} (${row.applied_at})` : 'PENDING'}`);
  }
  const pending = files.filter((f) => seen.get(f)?.status !== 'completed');
  console.log(pending.length ? `pending: ${pending.length}` : 'pending: none — schema is current');

  for (const table of ['users', 'events', 'bookings', 'email_outbox', 'images']) {
    try {
      const rows = await sql.query(`SELECT COUNT(*)::int AS n FROM ${table}`, []);
      console.log(`  ${table}: ${rows[0].n} row(s)`);
    } catch {
      console.log(`  ${table}: (missing)`);
    }
  }
} catch (e) {
  fail(e.message);
}
