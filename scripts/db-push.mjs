// npm run db:push — schema synchronization for development.
// Default: dry-run diff of live schema vs scripts/schema.mjs (exit 2 on drift).
// --apply: converge by applying pending migrations, then re-diff.
// This tool NEVER drops/renames anything: unexpected objects are reported and
// destructive changes require a reviewed migration file. Production deploys
// should use `npm run db:migrate` instead.
import { EXPECTED_INDEXES, EXPECTED_TABLES } from './schema.mjs';
import { applyMigrations } from './runner.mjs';
import { db, fail, hasFlag, loadEnv, ok } from './lib.mjs';

loadEnv();

async function diff(sql) {
  const drift = [];
  const tables = await sql.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`, []);
  const have = new Set(tables.map((r) => r.tablename));
  for (const [table, columns] of Object.entries(EXPECTED_TABLES)) {
    if (!have.has(table)) {
      drift.push(`missing table: ${table}`);
      continue;
    }
    const cols = await sql.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    );
    const haveCols = new Set(cols.map((r) => r.column_name));
    for (const col of columns) {
      if (!haveCols.has(col)) drift.push(`missing column: ${table}.${col}`);
    }
  }
  for (const name of have) {
    if (!EXPECTED_TABLES[name]) drift.push(`unmanaged table (left untouched): ${name}`);
  }
  const indexes = await sql.query(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`, []);
  const haveIdx = new Set(indexes.map((r) => r.indexname));
  for (const name of EXPECTED_INDEXES) {
    if (!haveIdx.has(name)) drift.push(`missing index: ${name}`);
  }
  return drift;
}

try {
  const sql = await db();
  let drift = await diff(sql);
  if (drift.length === 0) {
    ok('live schema matches the intended schema');
    process.exit(0);
  }
  console.log('schema drift:');
  for (const d of drift) console.log(`  - ${d}`);

  if (!hasFlag('apply')) {
    console.log('\ndry run only. Re-run with --apply to converge via pending migrations.');
    console.log('Unmanaged objects are never dropped by this tool.');
    process.exit(2);
  }
  console.log('\n--apply: applying pending migrations...');
  const report = await applyMigrations();
  for (const r of report) console.log(`  ${r.file}: ${r.action}`);
  drift = await diff(sql);
  if (drift.length === 0) {
    ok('schema converged');
  } else {
    console.log('\nremaining drift (requires a reviewed migration file — never auto-dropped):');
    for (const d of drift) console.log(`  - ${d}`);
    process.exit(2);
  }
} catch (e) {
  fail(e.message);
}
