import type { NeonQueryFunction } from '@neondatabase/serverless';

// Neon query layer over the HTTP driver (works serverless, edge, and behind
// proxies — no TCP/WebSocket required). Only used when DATABASE_URL resolves
// to Neon. Queries are parameterized ($1, $2, ...); each call is independent
// (no interactive transactions), so multi-step consistency uses single
// atomic statements (conditional INSERT/UPDATE, ON CONFLICT).

let sql: NeonQueryFunction<false, false> | null = null;

export function isNeonEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function getSql(): Promise<NeonQueryFunction<false, false>> {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  const mod = await import('@neondatabase/serverless');
  sql = mod.neon(url);
  return sql;
}

export async function neonQuery<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = await getSql();
  const rows = await client.query(text, params as never[]);
  return rows as T[];
}
