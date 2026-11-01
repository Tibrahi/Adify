'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import type { CountryInfo } from '@/lib/countries';

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${60 * 60 * 24 * 90};samesite=lax`;
}

// Header country selector. Manual selection only; never geolocates.
export function LocationPicker({
  eligible,
  africans,
  current,
}: {
  eligible: string[];
  africans: CountryInfo[];
  current: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const map = new Map(africans.map((c) => [c.code, c] as const));
  const shown = eligible
    .map((code) => map.get(code))
    .filter((c): c is CountryInfo => Boolean(c));
  const currentInfo = current ? map.get(current) : undefined;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-adify-line bg-white px-3 py-2 text-sm hover:border-adify-action"
      >
        <Icon name="location" />
        <span className="max-w-28 truncate">{currentInfo ? `${currentInfo.flag} ${currentInfo.name}` : 'All Africa'}</span>
        <Icon name="expand" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 max-h-72 w-64 overflow-auto rounded-md border border-adify-line bg-white shadow-lg" role="listbox" aria-label="Country">
          <button
            type="button"
            role="option"
            aria-selected={!current}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-adify-mist"
            onClick={() => {
              setCookie('adify_country', '');
              setOpen(false);
              router.refresh();
            }}
          >
            All Africa
          </button>
          {shown.map((c) => (
            <button
              key={c.code}
              type="button"
              role="option"
              aria-selected={current === c.code}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-adify-mist"
              onClick={() => {
                setCookie('adify_country', c.code);
                setOpen(false);
                router.refresh();
              }}
            >
              {c.flag} {c.name}
            </button>
          ))}
          {shown.length === 0 && (
            <p className="px-3 py-2 text-sm text-adify-muted">No countries have listings yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-adify-line px-3"
      >
        <Icon name={open ? 'close' : 'menu'} label={open ? 'Close menu' : 'Open menu'} />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-adify-line bg-white px-4 pb-4 pt-2 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

export function ProfileMenu({ name, extra }: { name: string; extra: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const initial = (name.trim()[0] ?? 'A').toUpperCase();
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-adify-line bg-white px-3 py-2 text-sm hover:border-adify-action"
      >
        <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-adify-wash text-xs font-bold">
          {initial}
        </span>
        <span className="max-w-24 truncate">{name}</span>
        <Icon name="expand" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-52 rounded-md border border-adify-line bg-white py-1 shadow-lg">
          {extra}
        </div>
      )}
    </div>
  );
}
