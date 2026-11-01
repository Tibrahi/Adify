import Link from 'next/link';
import { connection } from 'next/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/MinimalHeader';
import { SearchAndFilters } from '@/components/SearchAndFilters';
import { EventCard, EventGrid } from '@/components/EventCard';
import { EmptyState, ErrorState } from '@/components/States';
import { Pagination } from '@/components/Pagination';
import { AFRICAN_COUNTRIES } from '@/lib/countries';
import { parseFilters, parsePage, type SearchParams } from '@/lib/discovery';
import {
  confirmedSpotsMany,
  distinctCategories,
  getOwnerNames,
  listEvents,
} from '@/lib/repo';

export const metadata = { title: 'Discover events' };

// Live discovery must block on fresh data (see app/page.tsx).
export const instant = false;

const PAGE_SIZE = 12;

export default async function Discover({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Same as Home: visibility depends on server time, so force request-time.
  await connection();
  const sp = await searchParams;
  const page = parsePage(sp);
  const filters = parseFilters(sp);

  let categories: string[] = [];
  try {
    categories = await distinctCategories();
  } catch {
    // filters still render; search keeps working against live query below
  }

  let items: Awaited<ReturnType<typeof listEvents>>['items'] = [];
  let total = 0;
  let failed = false;
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
    failed = true;
  }

  const [names, used] = await Promise.all([
    getOwnerNames(items.map((e) => e.ownerId)).catch(() => ({}) as Record<string, string>),
    confirmedSpotsMany(items.map((e) => e.id)).catch(() => ({}) as Record<string, number>),
  ]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-8 pt-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Discover events &amp; ceremonies</h1>
        <p className="mt-1 text-sm text-adify-muted">
          Every listing below is live, published, and bookable.
        </p>
        <div className="mt-4">
          <SearchAndFilters categories={categories} africans={AFRICAN_COUNTRIES} base="/discover" showSearch />
        </div>
        <div className="mt-6">
          {failed ? (
            <ErrorState body="Search failed. Please try again." retryHref="/discover" />
          ) : items.length === 0 ? (
            <EmptyState
              title="No matching events"
              body="Try different keywords, widen the date range, or explore another country."
              actions={
                <Link href="/discover" className="inline-flex min-h-11 items-center rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark">
                  Reset filters
                </Link>
              }
            />
          ) : (
            <>
              <p className="mb-3 text-sm text-adify-muted" role="status">
                {total} listing{total === 1 ? '' : 's'} found.
              </p>
              <EventGrid>
                {items.map((e, i) => (
                  <EventCard key={e.id} event={e} ownerName={names[e.ownerId] ?? ''} used={used[e.id] ?? 0} eager={i < 2} />
                ))}
              </EventGrid>
              <Pagination sp={sp} base="/discover" page={page} total={total} perPage={PAGE_SIZE} />
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
