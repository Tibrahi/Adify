import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { getCurrentUser } from '@/lib/auth';
import { formatEventDateTime, formatRelative } from '@/lib/dates';
import { lifecycleOf } from '@/lib/events';
import { listUserBookings, listEvents, listUserNotifications } from '@/lib/repo';

export const metadata = { title: 'Dashboard' };

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-adify-line bg-white p-4" aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function DashboardHome() {
  const user = (await getCurrentUser())!;
  const [bookings, mine, notes] = await Promise.all([
    listUserBookings(user.id, { status: 'active' }).catch(() => []),
    listEvents({ ownerId: user.id, sort: 'created_desc', limit: 5 }).catch(() => ({ items: [], total: 0 })),
    listUserNotifications(user.id, 5).catch(() => []),
  ]);
  const firstName = user.fullName.split(' ')[0] || user.fullName;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-adify-line bg-adify-mist p-5">
        <h1 className="text-2xl font-bold">Welcome, {firstName}.</h1>
        <p className="mt-1 text-sm text-adify-muted">
          Discover gatherings across Africa or publish your own.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/events/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark">
            <Icon name="create" className="text-white" /> Post an Event
          </Link>
          <Link href="/discover" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-adify-line bg-white px-4 py-2 text-sm font-bold hover:border-adify-action">
            <Icon name="search" /> Discover Events
          </Link>
        </div>
      </div>

      <Panel
        title="My Upcoming Bookings"
        action={
          <Link href="/dashboard/bookings" className="text-sm font-bold text-adify-action hover:underline">
            View all
          </Link>
        }
      >
        {bookings.length === 0 ? (
          <p className="text-sm text-adify-muted">
            No upcoming bookings yet.{' '}
            <Link href="/discover" className="font-bold text-adify-action hover:underline">
              Discover events
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-adify-line">
            {bookings.slice(0, 5).map(({ booking, event }) => (
              <li key={booking.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <Link href={`/events/${event.id}`} className="font-bold hover:underline">
                  {event.title}
                </Link>
                <span className="text-adify-muted">{formatEventDateTime(event.startAt, event.timezone)}</span>
                <span className="rounded bg-adify-wash px-2 py-0.5 text-xs font-medium">{booking.status}</span>
                <span className="text-xs text-adify-muted">{booking.reference}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="My Events"
        action={
          <Link href="/dashboard/events" className="text-sm font-bold text-adify-action hover:underline">
            Manage
          </Link>
        }
      >
        {mine.items.length === 0 ? (
          <p className="text-sm text-adify-muted">
            You have not published anything yet.{' '}
            <Link href="/dashboard/events/new" className="font-bold text-adify-action hover:underline">
              Post an Event
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-adify-line">
            {mine.items.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="font-bold">{e.title}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{e.status}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{lifecycleOf(e)}</span>
                <Link href={`/dashboard/events/${e.id}`} className="ml-auto font-bold text-adify-action hover:underline">
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Recent Notifications"
        action={
          <Link href="/dashboard/notifications" className="text-sm font-bold text-adify-action hover:underline">
            View all
          </Link>
        }
      >
        {notes.length === 0 ? (
          <p className="text-sm text-adify-muted">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-adify-line">
            {notes.map((n) => (
              <li key={n.id} className="py-2 text-sm">
                <p className={n.readAt ? '' : 'font-bold'}>{n.title}</p>
                {n.body && <p className="text-adify-muted">{n.body}</p>}
                <p className="text-xs text-adify-muted">{formatRelative(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
