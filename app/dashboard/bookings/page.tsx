import Link from 'next/link';
import { CancelBookingButton } from '@/components/DashboardActions';
import { EmptyState } from '@/components/States';
import { getCurrentUser } from '@/lib/auth';
import { formatEventDateTime } from '@/lib/dates';
import { listUserBookings } from '@/lib/repo';
import type { BookingStatus } from '@/lib/types';

export const metadata = { title: 'My Bookings' };

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'waitlisted', label: 'Waitlisted' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'past', label: 'Past' },
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = (await getCurrentUser())!;
  const sp = await searchParams;
  const tab = typeof sp.tab === 'string' ? sp.tab : 'all';
  const status =
    tab === 'past'
      ? 'past'
      : (['pending', 'confirmed', 'waitlisted', 'cancelled'] as BookingStatus[]).includes(tab as BookingStatus)
        ? (tab as BookingStatus)
        : undefined;
  const rows = await listUserBookings(user.id, status ? { status } : {}).catch(() => []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Bookings</h1>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Booking filters">
        {TABS.map((t) => {
          const active = (t.key === 'all' && tab !== 'pending' && tab !== 'confirmed' && tab !== 'waitlisted' && tab !== 'cancelled' && tab !== 'past') || tab === t.key;
          return (
            <Link
              key={t.key}
              role="tab"
              aria-selected={active}
              href={t.key === 'all' ? '/dashboard/bookings' : `/dashboard/bookings?tab=${t.key}`}
              className={`inline-flex min-h-10 items-center rounded-full border px-3.5 py-2 text-sm font-medium ${
                active ? 'border-adify-action bg-adify-action text-white' : 'border-adify-line bg-white hover:border-adify-action'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No bookings here"
          body="When you request or reserve spots at events, they will appear in this list."
          actions={
            <Link href="/discover" className="inline-flex min-h-11 items-center rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark">
              Discover events
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map(({ booking, event }) => {
            const active =
              booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'waitlisted';
            const showAccess =
              event.attendance !== 'physical' && booking.status === 'confirmed' && event.onlineAccess;
            return (
              <li key={booking.id} className="rounded-lg border border-adify-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/events/${event.id}`} className="font-bold hover:underline">
                    {event.title}
                  </Link>
                  <span className="rounded bg-adify-wash px-2 py-0.5 text-xs font-medium">{booking.status}</span>
                  <span className="text-xs text-adify-muted">{booking.reference}</span>
                </div>
                <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-adify-muted">When:</dt>
                    <dd className="font-medium">{formatEventDateTime(event.startAt, event.timezone)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-adify-muted">Format:</dt>
                    <dd className="font-medium">{event.attendance}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-adify-muted">Where:</dt>
                    <dd className="font-medium">
                      {event.attendance === 'online'
                        ? 'Online'
                        : [event.venueName, event.city, event.country].filter(Boolean).join(' · ')}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-adify-muted">Spots:</dt>
                    <dd className="font-medium">{booking.spots}</dd>
                  </div>
                </dl>
                {showAccess && (
                  <p className="mt-2 rounded-md bg-adify-mist px-3 py-2 text-sm">
                    <strong>Access:</strong> {event.onlineAccess}
                  </p>
                )}
                {active && (
                  <div className="mt-3">
                    <CancelBookingButton id={booking.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
