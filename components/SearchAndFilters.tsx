'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from './Icon';
import type { CountryInfo } from '@/lib/countries';

function useFilterNav(base: string) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const target = base || pathname;
  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    next.delete('page');
    const qs = next.toString();
    router.replace(qs ? `${target}?${qs}` : target, { scroll: false });
  };
  const clear = () => router.replace(target, { scroll: false });
  return { params, set, clear };
}

function Chip({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`inline-flex min-h-10 items-center rounded-full border px-3.5 py-2 text-sm font-medium ${
        active
          ? 'border-adify-action bg-adify-action text-white'
          : 'border-adify-line bg-white hover:border-adify-action'
      }`}
    >
      {children}
    </button>
  );
}

function DebouncedInput({
  name,
  value,
  placeholder,
  label,
  type,
  onCommit,
}: {
  name: string;
  value: string;
  placeholder: string;
  label: string;
  type: string;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  // Render-time adjustment keeps the field in sync with committed URL values
  // without an effect (React-endorsed alternative to sync effects).
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocal(value);
  }
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onCommit(local.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);
  return (
    <div>
      <label htmlFor={name} className="sr-only">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        className="min-h-11 w-full rounded-md border border-adify-line bg-white px-3 py-2 text-sm placeholder:text-adify-muted focus:border-adify-action"
      />
    </div>
  );
}

function FiltersInner({
  categories,
  africans,
  base,
  showSearch,
}: {
  categories: string[];
  africans: CountryInfo[];
  base: string;
  showSearch: boolean;
}) {
  const { params, set, clear } = useFilterNav(base);
  const q = params.get('q') ?? '';
  const city = params.get('city') ?? '';
  const cls = params.get('class') ?? '';
  const pricing = params.get('pricing') ?? '';
  const attendance = params.get('attendance') ?? '';
  const time = params.get('time') ?? '';
  const category = params.get('category') ?? '';
  const country = params.get('country') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const available = params.get('available') === '1';
  const hasFilters = [...params.keys()].some((k) => k !== 'page');

  const toggle = (key: string, val: string, current: string) =>
    set({ [key]: current === val ? null : val });

  return (
    <div className="space-y-3">
      {showSearch && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <Icon name="search" />
            </span>
            <DebouncedInput
              name="q"
              label="Search events and ceremonies"
              type="search"
              placeholder="Search by title, keyword, category, city, or organizer…"
              value={q}
              onCommit={(v) => set({ q: v || null })}
            />
            <style jsx>{`input[type="search"]{padding-left:2.5rem}`}</style>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick filters">
        <Chip active={!cls && !pricing && !attendance && !time} onClick={clear} label="Show all listings">
          All
        </Chip>
        <Chip active={cls === 'event'} onClick={() => toggle('class', 'event', cls)} label="Filter to events">
          Events
        </Chip>
        <Chip active={cls === 'ceremony'} onClick={() => toggle('class', 'ceremony', cls)} label="Filter to ceremonies">
          Ceremonies
        </Chip>
        <Chip active={pricing === 'free'} onClick={() => toggle('pricing', 'free', pricing)} label="Filter to free listings">
          Free
        </Chip>
        <Chip active={pricing === 'paid'} onClick={() => toggle('pricing', 'paid', pricing)} label="Filter to paid listings">
          Paid
        </Chip>
        <Chip active={attendance === 'physical'} onClick={() => toggle('attendance', 'physical', attendance)} label="Filter to physical listings">
          Physical
        </Chip>
        <Chip active={attendance === 'online'} onClick={() => toggle('attendance', 'online', attendance)} label="Filter to online listings">
          Online
        </Chip>
        <Chip active={attendance === 'hybrid'} onClick={() => toggle('attendance', 'hybrid', attendance)} label="Filter to hybrid listings">
          Hybrid
        </Chip>
        <Chip active={time === 'upcoming'} onClick={() => toggle('time', 'upcoming', time)} label="Filter to upcoming listings">
          Upcoming
        </Chip>
        <Chip active={time === 'happening'} onClick={() => toggle('time', 'happening', time)} label="Filter to listings happening now">
          Happening now
        </Chip>
      </div>
      <details className="rounded-md border border-adify-line bg-white">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm font-bold">
          <Icon name="filter" /> More filters
          {hasFilters && <span className="rounded bg-adify-wash px-2 py-0.5 text-xs">Active</span>}
        </summary>
        <div className="grid grid-cols-1 gap-3 border-t border-adify-line p-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="f-category" className="mb-1 block text-sm font-medium">
              Category
            </label>
            <select
              id="f-category"
              value={category}
              onChange={(e) => set({ category: e.target.value || null })}
              className="min-h-11 w-full rounded-md border border-adify-line bg-white px-3 py-2 text-sm"
            >
              <option value="">Any category</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-country" className="mb-1 block text-sm font-medium">
              Country
            </label>
            <select
              id="f-country"
              value={country}
              onChange={(e) => set({ country: e.target.value || null })}
              className="min-h-11 w-full rounded-md border border-adify-line bg-white px-3 py-2 text-sm"
            >
              <option value="">All Africa</option>
              {africans.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium">City</span>
            <DebouncedInput name="city" label="City" type="text" placeholder="e.g. Lagos" value={city} onCommit={(v) => set({ city: v || null })} />
          </div>
          <div>
            <label htmlFor="f-from" className="mb-1 block text-sm font-medium">
              From date
            </label>
            <input
              id="f-from"
              type="date"
              value={from}
              onChange={(e) => set({ from: e.target.value || null })}
              className="min-h-11 w-full rounded-md border border-adify-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="f-to" className="mb-1 block text-sm font-medium">
              To date
            </label>
            <input
              id="f-to"
              type="date"
              value={to}
              onChange={(e) => set({ to: e.target.value || null })}
              className="min-h-11 w-full rounded-md border border-adify-line bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => set({ available: e.target.checked ? '1' : null })}
                className="h-5 w-5 accent-adify-action"
              />
              Available spots only
            </label>
          </div>
        </div>
        {hasFilters && (
          <div className="border-t border-adify-line p-3">
            <button
              type="button"
              onClick={clear}
              className="inline-flex min-h-11 items-center rounded-md border border-adify-line px-4 py-2 text-sm font-bold hover:border-adify-action"
            >
              Reset filters
            </button>
          </div>
        )}
      </details>
    </div>
  );
}

export function SearchAndFilters(props: {
  categories: string[];
  africans: CountryInfo[];
  base: string;
  showSearch: boolean;
}) {
  return (
    <Suspense fallback={<div className="h-28 animate-pulse rounded-md bg-adify-mist" aria-label="Loading filters" />}>
      <FiltersInner {...props} />
    </Suspense>
  );
}
