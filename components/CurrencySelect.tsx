'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ALL_CURRENCIES, currencyByCode, searchCurrencies } from '@/lib/currency';

// Searchable currency combobox backed by the world-countries dataset.
// Searches currency code, currency name and country names; submits the
// selected ISO code through a hidden input. Fully keyboard operable.
export function CurrencySelect({
  name,
  defaultCode,
  required,
  label,
}: {
  name: string;
  defaultCode: string;
  required?: boolean;
  label: React.ReactNode;
}) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const initial = currencyByCode(defaultCode);
  const [query, setQuery] = useState(initial ? `${initial.code} — ${initial.name}` : '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchCurrencies(code && query.startsWith(code) ? '' : query), [query, code]);

  // Mount-only restore of an autosaved wizard draft (external system read —
  // deliberately not a render-time read, which would break SSR hydration).
  /* eslint-disable react-hooks/set-state-in-effect -- mount-only localStorage restore; see EventWizard */
  useEffect(() => {
    if (defaultCode) return;
    try {
      const raw = localStorage.getItem('adify:event:draft');
      const saved = raw ? (JSON.parse(raw) as Record<string, string>) : null;
      const c = (saved?.currency ?? '').toUpperCase();
      const entry = c ? currencyByCode(c) : null;
      if (entry) {
        setCode(entry.code);
        setQuery(`${entry.code} — ${entry.name}`);
      }
    } catch {
      // no usable draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const choose = (selected: string) => {
    const entry = currencyByCode(selected);
    setCode(selected);
    setQuery(entry ? `${entry.code} — ${entry.name}` : selected);
    setOpen(false);
    setHighlight(0);
  };

  return (
    <div className="relative">
      <label htmlFor={baseId} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input type="hidden" name={name} value={code} />
      <input
        ref={inputRef}
        id={baseId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search currency or country…"
        value={query}
        required={required && !code}
        onChange={(e) => {
          setQuery(e.target.value);
          setCode('');
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter' && open && results[highlight]) {
            e.preventDefault();
            choose(results[highlight].code);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="min-h-11 w-full rounded-md border border-adify-line bg-white px-3 py-2 text-sm placeholder:text-adify-muted"
      />
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Currencies"
          className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-md border border-adify-line bg-white py-1 shadow-lg"
        >
          {results.map((entry, i) => (
            <li key={entry.code} role="option" aria-selected={code === entry.code}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(entry.code);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  i === highlight ? 'bg-adify-mist' : ''
                }`}
              >
                <span className="font-bold">{entry.code}</span>{' '}
                <span className="text-adify-muted">
                  {entry.symbol} {entry.name}
                </span>
                <span className="block truncate text-xs text-adify-muted">
                  {entry.countries
                    .slice(0, 4)
                    .map((c) => `${c.flag} ${c.name}`)
                    .join(' · ')}
                  {entry.countries.length > 4 ? ` +${entry.countries.length - 4} more` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-adify-muted">
        {ALL_CURRENCIES.length} world currencies · type to search by currency or country.
      </p>
    </div>
  );
}
