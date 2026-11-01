import fs from 'node:fs';
import path from 'node:path';
import type { DbShape } from './types';

// Local file-backed store. Used when DATABASE_URL is unset so the full
// system runs without external services. Same schema as migrations/001_init.sql.
// IO is synchronous, which keeps read-modify-write atomic in one process.
// Multi-instance production deployments must set DATABASE_URL (Neon path).

export function dataFilePath(): string {
  if (process.env.DATA_FILE) return process.env.DATA_FILE;
  return path.join(process.cwd(), 'data', 'adify.json');
}

export function emptyDb(): DbShape {
  return {
    users: [],
    sessions: [],
    codes: [],
    events: [],
    bookings: [],
    notifications: [],
    support: [],
    audit: [],
    images: [],
    outbox: [],
  };
}

export function loadDb(): DbShape {
  const file = dataFilePath();
  try {
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    return { ...emptyDb(), ...parsed };
  } catch {
    return emptyDb();
  }
}

export function saveDb(db: DbShape): void {
  const file = dataFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

export function withDb<T>(fn: (db: DbShape) => T): T {
  const db = loadDb();
  const result = fn(db);
  saveDb(db);
  return result;
}

export function readDb<T>(fn: (db: DbShape) => T): T {
  return fn(loadDb());
}
