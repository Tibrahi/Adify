import Link from 'next/link';
import { EmptyState } from '@/components/States';
import { Icon } from '@/components/Icon';
import { getCurrentUser } from '@/lib/auth';
import { formatEventDateTime } from '@/lib/dates';
import { lifecycleOf, serverNowMs } from '@/lib/events';
import { confirmedSpotsMany, listEvents } from '@/lib/repo';
import { coverDisplayUrl } from '@/lib/storage';

export const metadata = { title: 'My Events' };

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'pending', label: 'Pending Review' },
  { key: 'published', label: 'Published' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'rejected', label: 'Rejected' },
];

export default async function MyEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = (await getCurrentUser())!;
  const sp = await searchParams;
  const tab = typeof sp.tab === 'string' ? sp.tab : 'all';
  // Owner scope is small; one query + local tab filter keeps behavior exact
  // for the derived "completed" lifecycle.
  const { items } = await listEvents({ ownerId: user.id, sort: 'created_desc', limit: 100 }).catch(() => ({
    items: [],
    total: 0,
  }));
  const now = serverNowMs();
  const filtered = items.filter((e) => {
    if (tab === 'all') return true;
    if (tab === 'completed') return e.status === 'published' && lifecycleOf(e, now) === 'completed';
    if (tab === 'published') return e.status === 'published' && lifecycleOf(e, now) !== 'completed';
    return e.status === tab;
  });
  const used = await confirmedSpotsMany(filtered.map((e) => e.id)).catch(() => ({}) as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">My Events</h1>
        <Link href="/dashboard/events/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark">
          <Icon name="create" className="text-white" /> Create Event
        </Link>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Listing filters">
        {TABS.map((t) => {
          const active = tab === t.key || (t.key === 'all' && !TABS.some((x) => x.key === tab));
          return (
            <Link
              key={t.key}
              role="tab"
              aria-selected={active}
              href={t.key === 'all' ? '/dashboard/events' : `/dashboard/events?tab=${t.key}`}
              className={`inline-flex min-h-10 items-center rounded-full border px-3.5 py-2 text-sm font-medium ${
                active ? 'border-adify-action bg-adify-action text-white' : 'border-adify-line bg-white hover:border-adify-action'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="Create your first public event or ceremony to see it in this workspace."
          actions={
            <Link href="/dashboard/events/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark">
              <Icon name="create" className="text-white" /> Create Event
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((e) => (
            <li key={e.id} className="flex flex-col gap-3 rounded-lg border border-adify-line bg-white p-4 sm:flex-row sm:items-center">
              {coverDisplayUrl(e) ? (
                // eslint-disable-next-line @next/next/no-img-element -- route-served covers (no remote-image config needed)
                <img src={coverDisplayUrl(e)} alt="" className="h-16 w-24 shrink-0 rounded object-cover" loading="lazy" />
              ) : (
                <span aria-hidden className="flex h-16 w-24 shrink-0 items-center justify-center rounded bg-adify-mist text-2xl font-bold text-adify-action/40">
                  {(e.title.trim()[0] ?? 'A').toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold">{e.title}</p>
                <p className="mt-0.5 text-sm text-adify-muted">
                  {e.class} · {formatEventDateTime(e.startAt, e.timezone)}
                </p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{e.status}</span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{lifecycleOf(e, now)}</span>
                  {e.capacityType === 'limited' && typeof e.capacity === 'number' && (
                    <span className="rounded bg-adify-wash px-2 py-0.5 text-xs">
                      {used[e.id] ?? 0}/{e.capacity} booked
                    </span>
                  )}
                </p>
              </div>
              <Link href={`/dashboard/events/${e.id}`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-adify-line px-4 py-2 text-sm font-bold hover:border-adify-action sm:w-auto">
                Manage
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
