import { formatInTimeZone } from 'date-fns-tz';

// All event times render in the event's own timezone, never the browser's.

function safeTz(tz: string): string {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

export function formatEventDateTime(iso: string, tz: string): string {
  try {
    return formatInTimeZone(new Date(iso), safeTz(tz), 'EEE, d MMM yyyy · h:mm a zzz');
  } catch {
    return iso;
  }
}

export function formatEventDate(iso: string, tz: string): string {
  try {
    return formatInTimeZone(new Date(iso), safeTz(tz), 'EEE, d MMM yyyy');
  } catch {
    return iso;
  }
}

export function formatEventTime(iso: string, tz: string): string {
  try {
    return formatInTimeZone(new Date(iso), safeTz(tz), 'h:mm a zzz');
  } catch {
    return iso;
  }
}

export function formatCardDate(iso: string, tz: string): { day: string; month: string } {
  try {
    return {
      day: formatInTimeZone(new Date(iso), safeTz(tz), 'd'),
      month: formatInTimeZone(new Date(iso), safeTz(tz), 'MMM'),
    };
  } catch {
    return { day: '', month: '' };
  }
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || ''} ${amount}`.trim();
  }
}

// Display-only conversion of canonical integer minor units. All storage and
// comparisons use the integer; this division never feeds back into data.
export function formatMoneyMinor(minor: number | null, currency: string): string {
  if (minor === null || !Number.isInteger(minor)) return 'Free';
  return formatMoney(minor / 100, currency);
}

// Canonical price for an event: integer minor units, with legacy float rows
// converted once at read time (never written back as float).
export function eventPriceMinor(event: { priceAmountMinor: number | null; priceAmount: number | null }): number | null {
  if (typeof event.priceAmountMinor === 'number' && Number.isInteger(event.priceAmountMinor)) {
    return event.priceAmountMinor;
  }
  if (typeof event.priceAmount === 'number' && Number.isFinite(event.priceAmount)) {
    return Math.round(event.priceAmount * 100);
  }
  return null;
}

export function formatRelative(iso: string, nowMs: number = Date.now()): string {
  const diff = Date.parse(iso) - nowMs;
  const abs = Math.abs(diff);
  const min = Math.floor(abs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return diff > 0 ? `in ${min}m` : `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return diff > 0 ? `in ${hours}h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return diff > 0 ? `in ${days}d` : `${days}d ago`;
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
}
