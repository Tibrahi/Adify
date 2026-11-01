import countries, { type Country } from 'world-countries';

// Single source of truth for country data (names, ISO codes, flags, calling
// codes). No duplicated hardcoded country lists elsewhere in the app.

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  callingCode: string;
  region: string;
}

function callingCodeOf(c: Country): string {
  const root = c.idd?.root ?? '';
  const suffix = c.idd?.suffixes?.[0] ?? '';
  if (!root) return '';
  return `${root}${suffix}`.replace(/\s+/g, '');
}

function toInfo(c: Country): CountryInfo {
  return {
    code: c.cca2,
    name: c.name?.common ?? c.cca2,
    flag: c.flag ?? '',
    callingCode: callingCodeOf(c),
    region: c.region ?? '',
  };
}

const ALL: CountryInfo[] = (countries as Country[])
  .filter((c) => c.cca2 && c.name?.common)
  .map(toInfo)
  .sort((a, b) => a.name.localeCompare(b.name));

export const ALL_COUNTRIES: CountryInfo[] = ALL;
export const AFRICAN_COUNTRIES: CountryInfo[] = ALL.filter((c) => c.region === 'Africa');

const byCode = new Map(ALL.map((c) => [c.code.toUpperCase(), c] as const));

export function countryByCode(code: string): CountryInfo | null {
  return byCode.get(code.toUpperCase()) ?? null;
}

export function isKnownCountryCode(code: string): boolean {
  return byCode.has(code.toUpperCase());
}
