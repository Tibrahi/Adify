// Small hand-rolled validators (server and client share these rules).

export function isEmail(value: string): boolean {
  if (value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('at least 8 characters');
  if (password.length > 128) issues.push('at most 128 characters');
  if (!/[a-zA-Z]/.test(password)) issues.push('a letter');
  if (!/[0-9]/.test(password)) issues.push('a number');
  return issues;
}

export function isValidTimezone(tz: string): boolean {
  if (!tz || tz.length > 80) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isCountryCode(value: string): boolean {
  return /^[A-Z]{2}$/.test(value);
}

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function hasHeaderInjection(value: string): boolean {
  return /[\r\n]/.test(value);
}
