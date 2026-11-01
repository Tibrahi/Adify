import type { EventFilters } from './types';
import { clampInt } from './validate';

export type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

const FILTER_KEYS = [
  'q', 'class', 'category', 'city', 'country', 'organizer', 'pricing',
  'attendance', 'time', 'from', 'to', 'available',
] as const;

export function hasActiveFilters(sp: SearchParams): boolean {
  return FILTER_KEYS.some((k) => first(sp[k]).trim() !== '');
}

export function parseFilters(sp: SearchParams): EventFilters {
  const cls = first(sp.class);
  const pricing = first(sp.pricing);
  const attendance = first(sp.attendance);
  const time = first(sp.time);
  const f: EventFilters = {};
  const q = first(sp.q).trim().slice(0, 200);
  if (q) f.q = q;
  if (cls === 'event' || cls === 'ceremony') f.class = cls;
  const category = first(sp.category).trim().slice(0, 80);
  if (category) f.category = category;
  const city = first(sp.city).trim().slice(0, 120);
  if (city) f.city = city;
  const country = first(sp.country).trim().toUpperCase().slice(0, 2);
  if (/^[A-Z]{2}$/.test(country)) f.country = country;
  const organizer = first(sp.organizer).trim().slice(0, 120);
  if (organizer) f.organizer = organizer;
  if (pricing === 'free' || pricing === 'paid') f.pricing = pricing;
  if (attendance === 'physical' || attendance === 'online' || attendance === 'hybrid') {
    f.attendance = attendance;
  }
  if (time === 'upcoming' || time === 'happening') f.time = time;
  const from = first(sp.from).trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) f.dateFrom = from;
  const to = first(sp.to).trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) f.dateTo = to;
  if (first(sp.available) === '1') f.availableOnly = true;
  return f;
}

export function parsePage(sp: SearchParams): number {
  return clampInt(first(sp.page), 1, 1, 1000);
}

export function pageHref(sp: SearchParams, base: string, page: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) params.append(k, item);
    } else {
      params.set(k, v);
    }
  }
  if (page <= 1) params.delete('page');
  else params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
