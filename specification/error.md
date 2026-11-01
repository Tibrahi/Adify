## Error Type
Runtime NeonDbError

## Error Message
Error connecting to database: TypeError: fetch failed


    at neonQuery (lib/neon.ts:26:16)
    at getUserByEmail (lib/repo.ts:249:18)
    at loginAction (lib/actions.ts:124:16)
    at AuthPage (app/auth/page.tsx:98:62)

## Code Frame
  24 | export async function neonQuery<T>(text: string, params: unknown[] = []): Promise<T[]> {
  25 |   const client = await getSql();
> 26 |   const rows = await client.query(text, params as never[]);
     |                ^
  27 |   return rows as T[];
  28 | }
  29 |

Next.js version: 16.4.3 (Turbopack)
