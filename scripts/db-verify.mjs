// npm run db:verify — verify live schema against scripts/schema.mjs.
import { EXPECTED_INDEXES, EXPECTED_TABLES, EXPECTED_UNIQUES } from './schema.mjs';
import { db, fail, loadEnv, ok } from './lib.mjs';

loadEnv();
const problems = [];

try {
  const sql = await db();
  const tables = await sql.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    [],
  );
  const have = new Set(tables.map((r) => r.tablename));

  for (const [table, columns] of Object.entries(EXPECTED_TABLES)) {
    if (!have.has(table)) {
      problems.push(`missing table: ${table}`);
      continue;
    }
    const cols = await sql.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    );
    const haveCols = new Set(cols.map((r) => r.column_name));
    for (const col of columns) {
      if (!haveCols.has(col)) problems.push(`missing column: ${table}.${col}`);
    }
  }
  if (problems.filter((p) => p.startsWith('missing table')).length === 0) {
    ok(`${Object.keys(EXPECTED_TABLES).length} expected tables present`);
  }

  const indexes = await sql.query(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`, []);
  const haveIdx = new Set(indexes.map((r) => r.indexname));
  for (const name of EXPECTED_INDEXES) {
    if (!haveIdx.has(name)) problems.push(`missing index: ${name}`);
  }

  for (const { table, columns } of EXPECTED_UNIQUES) {
    if (!have.has(table)) continue;
    // A unique constraint or unique index covering exactly these columns.
    const found = await sql.query(
      `SELECT 1 FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relname = $1 AND c.contype IN ('u', 'p')
       AND (SELECT array_agg(a.attname ORDER BY a.attnum) FROM pg_attribute a
            WHERE a.attrelid = t.oid AND a.attnum = ANY (c.conkey)) = $2`,
      [table, columns],
    );
    if (found.length === 0) problems.push(`missing unique constraint: ${table}(${columns.join(', ')})`);
  }

  const history = await sql.query(`SELECT COUNT(*)::int AS n FROM schema_migrations WHERE status = 'failed'`, []).catch(() => [{ n: -1 }]);
  if (history[0].n === -1) problems.push('migration history unavailable (schema_migrations missing)');
  else if (history[0].n > 0) problems.push(`${history[0].n} migration(s) recorded as failed`);

  if (problems.length) {
    console.error('schema verification FAILED:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  ok('tables, columns, indexes and key constraints all verified');
} catch (e) {
  if (e?.code === 'EXIT') throw e;
  fail(e.message);
}
