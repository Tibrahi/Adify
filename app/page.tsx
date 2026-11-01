import Link from 'next/link';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/MinimalHeader';
import { SearchAndFilters } from '@/components/SearchAndFilters';
import { EventCard, EventGrid } from '@/components/EventCard';
import { EmptyState, ErrorState, SectionHeader } from '@/components/States';
import { Pagination } from '@/components/Pagination';
import { Icon } from '@/components/Icon';
import { AFRICAN_COUNTRIES, countryByCode } from '@/lib/countries';
import { hasActiveFilters, parseFilters, parsePage, type SearchParams } from '@/lib/discovery';
import {
  confirmedSpotsMany,
  distinctCategories,
  distinctCountries,
  eligibleCounts,
  getOwnerNames,
  listEvents,
  type DiscoveryCounts,
} from '@/lib/repo';
import type { DbEvent } from '@/lib/types';

const PAGE_SIZE = 12;
const SECTION_SIZE = 8;

// Live discovery must block on fresh data: an instant-but-stale UI could show
// cancelled or ended listings, violating the spec's freshness requirements.
export const instant = false;

function Shell({ children, fullBleed }: { children: React.ReactNode; fullBleed?: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {fullBleed}
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-8">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

// Premium business hero: left-aligned, brand greens, live numbers computed
// from real eligible listings — never fabricated.
function Hero({
  locationLabel,
  counts,
  hasListings,
}: {
  locationLabel: string;
  counts: DiscoveryCounts;
  hasListings: boolean;
}) {
  const countryCount = Object.keys(counts.byCountry).length;
  return (
    <div className="border-b border-adify-action-dark bg-adify-action-dark text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
        <p className="text-sm font-medium text-white/80">{locationLabel}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">
          Discover public events &amp; ceremonies across Africa
        </h1>
        <p className="mt-3 max-w-xl text-base text-white/85">
          Live gatherings with real availability. Search by place, category, or
          date — then open a listing to request your spot.
        </p>
        {hasListings ? (
          <dl className="mt-6 flex flex-wrap gap-2" aria-label="Live platform activity">
            <div className="flex items-center gap-2 rounded-md bg-white/10 px-4 py-2">
              <dt className="sr-only">Live listings</dt>
              <dd className="text-sm font-bold">
                {counts.total} live listing{counts.total === 1 ? '' : 's'}
              </dd>
            </div>
            {counts.happening > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-white/10 px-4 py-2">
                <dt className="sr-only">Happening now</dt>
                <dd className="text-sm font-bold">
                  <span aria-hidden className="mr-1.5 inline-block h-2 w-2 rounded-full bg-white" />
                  {counts.happening} happening now
                </dd>
              </div>
            )}
            {countryCount > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-white/10 px-4 py-2">
                <dt className="sr-only">Countries</dt>
                <dd className="text-sm font-bold">
                  {countryCount} countr{countryCount === 1 ? 'y' : 'ies'}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="mt-6 max-w-xl rounded-md bg-white/10 px-4 py-3 text-sm font-medium">
            No public listings yet — be the first to publish a gathering for
            your community.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/discover"
            className="inline-flex min-h-12 items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-adify-action-dark hover:bg-adify-wash"
          >
            <Icon name="search" className="text-adify-action-dark" /> Browse events
          </Link>
          <Link
            href="/dashboard/events/new"
            className="inline-flex min-h-12 items-center gap-2 rounded-md border border-white/40 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            <Icon name="create" className="text-white" /> Post an Event
          </Link>
        </div>
      </div>
    </div>
  );
}

function CompactHead({ locationLabel }: { locationLabel: string }) {
  return (
    <div className="pb-2 pt-6">
      <p className="text-sm font-medium text-adify-muted">{locationLabel}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Search results</h1>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: '1', title: 'Search live listings', body: 'Filter by place, category, date or format. Everything shown is published and bookable.' },
    { n: '2', title: 'Open the details', body: 'See the real schedule, venue, price, policies and availability before you commit.' },
    { n: '3', title: 'Request your spot', body: 'One account books seats and publishes your own public gatherings.' },
  ];
  return (
    <section aria-label="How ADIFY works" className="rounded-lg border border-adify-line bg-white">
      <ol className="grid grid-cols-1 divide-y divide-adify-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-3 p-4 sm:p-5">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-adify-action text-sm font-bold text-white">
              {s.n}
            </span>
            <span>
              <span className="block font-bold">{s.title}</span>
              <span className="mt-0.5 block text-sm text-adify-muted">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function OrganizerBand() {
  return (
    <section aria-label="Publish your event" className="overflow-hidden rounded-lg bg-adify-action-dark text-white">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex-1">
          <h2 className="text-xl font-bold sm:text-2xl">Organizing something? Publish it on ADIFY.</h2>
          <p className="mt-1 max-w-xl text-sm text-white/85 sm:text-base">
            Reach people across Africa. Free to list, with booking requests,
            capacity control and attendee updates built in.
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-bold text-adify-action-dark hover:bg-adify-wash"
        >
          <Icon name="create" className="text-adify-action-dark" /> Post an Event
        </Link>
      </div>
    </section>
  );
}

async function Cards({ items }: { items: DbEvent[] }) {
  if (!items.length) return null;
  const [names, used] = await Promise.all([
    getOwnerNames(items.map((e) => e.ownerId)),
    confirmedSpotsMany(items.map((e) => e.id)),
  ]);
  return (
    <EventGrid>
      {items.map((e, i) => (
        <EventCard key={e.id} event={e} ownerName={names[e.ownerId] ?? ''} used={used[e.id] ?? 0} eager={i < 2} />
      ))}
    </EventGrid>
  );
}

const EMPTY_COUNTS: DiscoveryCounts = { total: 0, happening: 0, byCategory: {}, byCountry: {} };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Live discovery must render per request: listing visibility depends on the
  // current server time, so prerendering stops here deterministically.
  await connection();
  const sp = await searchParams;
  const store = await cookies();
  const selectedCountry = (store.get('adify_country')?.value ?? '').toUpperCase();
  const selectedInfo = selectedCountry ? countryByCode(selectedCountry) : null;

  let categories: string[] = [];
  let eligibleCountries: string[] = [];
  let counts: DiscoveryCounts = EMPTY_COUNTS;
  try {
    [categories, eligibleCountries, counts] = await Promise.all([
      distinctCategories(),
      distinctCountries(),
      eligibleCounts(),
    ]);
  } catch {
    return (
      <Shell
        fullBleed={<Hero locationLabel="All Africa" counts={EMPTY_COUNTS} hasListings={false} />}
      >
        <div className="mt-4">
          <ErrorState body="We could not load listings right now. Please check your connection and try again." retryHref="/" />
        </div>
      </Shell>
    );
  }

  const locationLabel = selectedInfo ? `Showing events near ${selectedInfo.flag} ${selectedInfo.name}` : 'Showing events across All Africa';
  const filtering = hasActiveFilters(sp);

  // ---- Filtered results view ----
  if (filtering) {
    const page = parsePage(sp);
    const filters = parseFilters(sp);
    let items: DbEvent[] = [];
    let total = 0;
    try {
      const res = await listEvents({
        ...filters,
        eligibleOnly: true,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      items = res.items;
      total = res.total;
    } catch {
      return (
        <Shell>
          <CompactHead locationLabel={locationLabel} />
          <div className="mt-4">
            <SearchAndFilters categories={categories} africans={AFRICAN_COUNTRIES} base="/" showSearch />
          </div>
          <div className="mt-4">
            <ErrorState body="Search failed. Please try again." retryHref="/" />
          </div>
        </Shell>
      );
    }
    return (
      <Shell>
        <CompactHead locationLabel={locationLabel} />
        <div className="mt-4">
          <SearchAndFilters categories={categories} africans={AFRICAN_COUNTRIES} base="/" showSearch />
        </div>
        <div className="mt-6">
          <p className="mb-3 text-sm text-adify-muted" role="status">
            {total === 0 ? 'No listings match your search.' : `${total} listing${total === 1 ? '' : 's'} found.`}
          </p>
          {items.length === 0 ? (
            <EmptyState
              title="No matching events"
              body="Try different keywords, widen the date range, or explore another country."
              actions={
                <Link href="/" className="inline-flex min-h-11 items-center rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark">
                  Reset filters
                </Link>
              }
            />
          ) : (
            <>
              <Cards items={items} />
              <Pagination sp={sp} base="/" page={page} total={total} perPage={PAGE_SIZE} />
            </>
          )}
        </div>
      </Shell>
    );
  }

  // ---- Discovery sections view (partial rendering: one failing section never blanks the page) ----
  const settled = await Promise.allSettled([
    listEvents({ eligibleOnly: true, time: 'happening', limit: SECTION_SIZE }),
    listEvents({ eligibleOnly: true, time: 'upcoming', limit: SECTION_SIZE }),
    selectedCountry
      ? listEvents({ eligibleOnly: true, country: selectedCountry, limit: SECTION_SIZE })
      : Promise.resolve({ items: [] as DbEvent[], total: 0 }),
  ]);
  const happening = settled[0].status === 'fulfilled' ? settled[0].value.items : [];
  const coming = settled[1].status === 'fulfilled' ? settled[1].value.items : [];
  let near = settled[2].status === 'fulfilled' ? settled[2].value.items : [];
  const shown = new Set([...happening, ...coming].map((e) => e.id));
  near = near.filter((e) => !shown.has(e.id)).slice(0, SECTION_SIZE);
  const hasListings = happening.length > 0 || coming.length > 0 || categories.length > 0;

  return (
    <Shell fullBleed={<Hero locationLabel={locationLabel} counts={counts} hasListings={hasListings} />}>
      <div className="mt-6 rounded-lg border border-adify-line bg-white p-3 shadow-sm sm:p-4">
        <SearchAndFilters categories={categories} africans={AFRICAN_COUNTRIES} base="/" showSearch />
      </div>

      {!hasListings ? (
        <div className="mt-6 space-y-6">
          <EmptyState
            title="No public events right now"
            body="There are no published public events or ceremonies at the moment. Check back soon, explore other locations, or publish your own gathering."
            actions={
              <>
                <Link href="/discover" className="inline-flex min-h-11 items-center rounded-md border border-adify-line px-4 py-2 text-sm font-bold hover:border-adify-action">
                  Explore locations
                </Link>
                <Link href="/dashboard/events/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark">
                  <Icon name="create" className="text-white" /> Post an Event
                </Link>
              </>
            }
          />
          <HowItWorks />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {happening.length > 0 && (
            <section aria-labelledby="sec-happening" className="rounded-lg bg-adify-mist p-4 sm:p-5">
              <div id="sec-happening">
                <SectionHeader title="Happening Now" subtitle="Already underway — join while you can." viewAllHref="/discover?time=happening" />
              </div>
              <Cards items={happening} />
            </section>
          )}
          {coming.length > 0 && (
            <section aria-labelledby="sec-coming">
              <div id="sec-coming">
                <SectionHeader title="Coming Up" subtitle="Nearest start dates first." viewAllHref="/discover?time=upcoming" />
              </div>
              <Cards items={coming} />
            </section>
          )}
          {near.length > 0 && selectedInfo && (
            <section aria-labelledby="sec-near">
              <div id="sec-near">
                <SectionHeader
                  title={`Near You · ${selectedInfo.name}`}
                  subtitle="Based on your selected country."
                  viewAllHref={`/discover?country=${selectedInfo.code}`}
                />
              </div>
              <Cards items={near} />
            </section>
          )}
          <HowItWorks />
          {categories.length > 0 && (
            <section aria-labelledby="sec-cats">
              <div id="sec-cats">
                <SectionHeader title="Explore by Category" subtitle="Live listings in each category." />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {categories.map((c) => {
                  const n = counts.byCategory[c] ?? 0;
                  return (
                    <Link
                      key={c}
                      href={`/discover?category=${encodeURIComponent(c)}`}
                      className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-adify-line bg-white px-4 py-3 text-sm font-bold shadow-sm hover:border-adify-action hover:bg-adify-mist"
                    >
                      <span>
                        {c}
                        <span className="ml-2 rounded bg-adify-wash px-1.5 py-0.5 text-xs font-medium">
                          {n}
                        </span>
                      </span>
                      <Icon name="arrow" className="text-adify-action" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
          {eligibleCountries.length > 0 && (
            <section aria-labelledby="sec-africa">
              <div id="sec-africa">
                <SectionHeader title="Explore Across Africa" subtitle="Only countries with live listings are shown." />
              </div>
              <div className="flex flex-wrap gap-2">
                {eligibleCountries.map((code) => {
                  const info = countryByCode(code);
                  const n = counts.byCountry[code] ?? 0;
                  return (
                    <Link
                      key={code}
                      href={`/discover?country=${code}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-adify-line bg-white px-4 py-2 text-sm font-medium shadow-sm hover:border-adify-action hover:bg-adify-mist"
                    >
                      <span aria-hidden>{info?.flag ?? ''}</span> {info?.name ?? code}
                      <span className="rounded bg-adify-wash px-1.5 py-0.5 text-xs font-bold">{n}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
          <OrganizerBand />
        </div>
      )}
    </Shell>
  );
}
