// npm run db:migrate — apply pending migrations (strict deploy path).
import { applyMigrations } from './runner.mjs';
import { fail, loadEnv, ok } from './lib.mjs';

loadEnv();

try {
  const report = await applyMigrations();
  for (const r of report) ok(`${r.file}: ${r.action}`);
  const applied = report.filter((r) => r.action === 'applied').length;
  console.log(`done: ${applied} applied, ${report.length - applied} already applied.`);
} catch (e) {
  fail(e.message);
}
