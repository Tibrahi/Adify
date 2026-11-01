import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CancelBookingButton, CancelEventButton, DecideButtons, PublishButton, UnpublishButton } from '@/components/DashboardActions';
import { Icon } from '@/components/Icon';
import { getCurrentUser } from '@/lib/auth';
import { formatEventDateTime, formatMoneyMinor, formatRelative, eventPriceMinor } from '@/lib/dates';
import { lifecycleOf } from '@/lib/events';
import { confirmedSpots, getEventById, getOwnerNames, listEventBookings } from '@/lib/repo';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id).catch(() => null);
  return { title: event ? `Manage · ${event.title}` : 'Manage listing' };
}

export default async function ManageEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const event = await getEventById(id).catch(() => null);
  if (!event || event.ownerId !== user.id) notFound();

  const [bookings, used] = await Promise.all([
    listEventBookings(id).catch(() => []),
    confirmedSpots(id).catch(() => 0),
  ]);
  const attendeeNames = await getOwnerNames(bookings.map((b) => b.userId)).catch(
    (): Record<string, string> => ({}),
  );
  const notice = typeof sp.notice === 'string' ? sp.notice : '';
  const life = lifecycleOf(event);

  const counts = {
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    waitlisted: bookings.filter((b) => b.status === 'waitlisted').length,
  };

  return (
    <div className="space-y-4">
      <Link href="/dashboard/events" className="text-sm font-bold text-adify-action hover:underline">
        ← My Events
      </Link>
      {notice === 'draft_saved' && (
        <p role="status" className="rounded-md bg-adify-wash px-4 py-3 text-sm font-medium">
          Saved as a draft — it needs a few more required details before it can be published.
        </p>
      )}

      <div className="rounded-lg border border-adify-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-adify-muted">
              {event.class} · {event.category} · {event.status} · {life}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{event.title}</h1>
            <p className="mt-1 text-sm text-adify-muted">
              {formatEventDateTime(event.startAt, event.timezone)} · {event.attendance} ·{' '}
              {event.pricing === 'paid' && eventPriceMinor(event) !== null ? formatMoneyMinor(eventPriceMinor(event), event.currency) : 'Free'}
            </p>
            {event.capacityType === 'limited' && typeof event.capacity === 'number' && (
              <p className="mt-1 text-sm text-adify-muted">
                {used} of {event.capacity} spots confirmed · {counts.pending} pending · {counts.waitlisted} waitlisted
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/events/${event.id}/edit`} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-adify-line px-3 py-2 text-sm font-bold hover:border-adify-action">
              <Icon name="edit" /> Edit
            </Link>
            <Link href={`/events/${event.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-adify-line px-3 py-2 text-sm font-bold hover:border-adify-action">
              <Icon name="eye" /> Preview
            </Link>
          </div>
        </div>
        {event.status !== 'cancelled' && event.status !== 'suspended' && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-adify-line pt-4">
            {event.status === 'published' ? <UnpublishButton id={event.id} /> : <PublishButton id={event.id} />}
            <CancelEventButton id={event.id} />
          </div>
        )}
      </div>

      <section className="rounded-lg border border-adify-line bg-white p-4 sm:p-5" aria-label="Booking requests">
        <h2 className="text-lg font-bold">Booking requests</h2>
        {bookings.length === 0 ? (
          <p className="mt-1 text-sm text-adify-muted">
            No booking requests yet. Share your listing to get attendees.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-adify-line text-adify-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">Reference</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Attendee</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Requested</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Spots</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                  <th scope="col" className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-adify-line last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{b.reference}</td>
                    <td className="py-2 pr-3 font-medium">{attendeeNames[b.userId] ?? 'Attendee'}</td>
                    <td className="py-2 pr-3 text-adify-muted">{formatRelative(b.createdAt)}</td>
                    <td className="py-2 pr-3">{b.spots}</td>
                    <td className="py-2 pr-3">
                      <span className="rounded bg-adify-wash px-2 py-0.5 text-xs font-medium">{b.status}</span>
                    </td>
                    <td className="py-2">
                      {(b.status === 'pending' || b.status === 'waitlisted') && <DecideButtons id={b.id} />}
                      {(b.status === 'confirmed') && <CancelBookingButton id={b.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
