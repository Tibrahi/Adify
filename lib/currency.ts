import countries, { type Country } from 'world-countries';

// Single source of truth for currency metadata, derived from the same
// world-countries dataset as lib/countries.ts (no hardcoded currency lists).
// Handles shared currencies (XOF, EUR, ...) and multi-currency countries.

export interface CurrencyCountry {
  code: string;
  name: string;
  flag: string;
}

export interface CurrencyEntry {
  code: string;
  name: string;
  symbol: string;
  countries: CurrencyCountry[];
}

function buildIndex(): CurrencyEntry[] {
  const byCode = new Map<string, CurrencyEntry>();
  for (const c of countries as Country[]) {
    const currencies = (c as { currencies?: Record<string, { name?: string; symbol?: string }> }).currencies ?? {};
    for (const [code, meta] of Object.entries(currencies)) {
      const normalized = code.toUpperCase();
      if (!/^[A-Z]{3}$/.test(normalized)) continue;
      let entry = byCode.get(normalized);
      if (!entry) {
        entry = { code: normalized, name: meta?.name ?? normalized, symbol: meta?.symbol ?? '', countries: [] };
        byCode.set(normalized, entry);
      }
      entry.countries.push({ code: c.cca2, name: c.name?.common ?? c.cca2, flag: c.flag ?? '' });
    }
  }
  for (const entry of byCode.values()) {
    entry.countries.sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

const ALL: CurrencyEntry[] = buildIndex();
const byCode = new Map(ALL.map((e) => [e.code, e] as const));

export const ALL_CURRENCIES: CurrencyEntry[] = ALL;

export function currencyByCode(code: string): CurrencyEntry | null {
  return byCode.get(code.toUpperCase()) ?? null;
}

export function isKnownCurrencyCode(code: string): boolean {
  return byCode.has(code.toUpperCase());
}

export function currenciesForCountry(countryCode: string): CurrencyEntry[] {
  const upper = countryCode.toUpperCase();
  return ALL.filter((e) => e.countries.some((c) => c.code === upper));
}

// Ranked search across currency code, currency name, and country names.
export function searchCurrencies(query: string, limit = 12): CurrencyEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL.slice(0, limit);
  const scored: { entry: CurrencyEntry; score: number }[] = [];
  for (const entry of ALL) {
    let score = -1;
    if (entry.code.toLowerCase() === q) score = 0;
    else if (entry.code.toLowerCase().startsWith(q)) score = 1;
    else if (entry.name.toLowerCase().includes(q)) score = 2;
    else if (entry.countries.some((c) => c.name.toLowerCase().includes(q))) score = 3;
    else if (entry.countries.some((c) => c.code.toLowerCase() === q)) score = 3;
    if (score >= 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => a.score - b.score || a.entry.code.localeCompare(b.entry.code));
  return scored.slice(0, Math.min(Math.max(limit, 1), 50)).map((s) => s.entry);
}
