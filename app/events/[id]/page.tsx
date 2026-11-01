import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/MinimalHeader';
import { BookingForm } from '@/components/BookingForm';
import { Icon } from '@/components/Icon';
import { ReadMore } from '@/components/ReadMore';
import { getCurrentUser } from '@/lib/auth';
import { countryByCode } from '@/lib/countries';
import { formatEventDateTime, formatMoneyMinor, eventPriceMinor } from '@/lib/dates';
import { coverDisplayUrl } from '@/lib/storage';
import { lifecycleOf, remainingSpots, resolveBookingAction } from '@/lib/events';
import {
  confirmedSpots,
  getEventById,
  getOwnerNames,
  getUserBookingForEvent,
} from '@/lib/repo';
import { excerpt } from '@/lib/util';

// Booking state and lifecycle are computed live per request.
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id).catch(() => null);
  if (!event) return { title: 'Event not found' };
  return {
    title: event.title,
    description: excerpt(event.description, 160),
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-adify-line bg-white p-4 sm:p-5" aria-label={title}>
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-adify-line py-2 last:border-0">
      <dt className="w-32 shrink-0 text-adify-muted">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium">{value}</dd>
    </div>
  );
}

export default async function EventDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Booking state and lifecycle depend on server time: render per request.
  await connection();
  const { id } = await params;
  const [event, user] = await Promise.all([
    getEventById(id).catch(() => null),
    getCurrentUser().catch(() => null),
  ]);
  if (!event) notFound();

  const isOwner = Boolean(user && user.id === event.ownerId);
  // Unpublished listings are visible only to their owner.
  if (event.status !== 'published' && !isOwner) notFound();

  const [names, used, existing] = await Promise.all([
    getOwnerNames([event.ownerId]),
    confirmedSpots(event.id),
    user ? getUserBookingForEvent(event.id, user.id) : Promise.resolve(null),
  ]);
  const life = lifecycleOf(event);
  const left = remainingSpots(event, used);
  const action = resolveBookingAction({
    event,
    confirmedUsed: used,
    existing,
    userId: user?.id ?? null,
  });
  const countryInfo = event.country ? countryByCode(event.country) : null;
  const cover = coverDisplayUrl(event);
  const minor = eventPriceMinor(event);
  const location =
    event.attendance === 'online'
      ? 'Online'
      : [event.venueName, event.city, countryInfo?.name ?? event.country].filter(Boolean).join(' · ');

  // Online access details go only to the owner and confirmed attendees.
  const canSeeAccess = isOwner || existing?.status === 'confirmed';
  const ended = life === 'completed' || life === 'cancelled' || life === 'suspended';

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-8 pt-6">
        <Link href="/discover" className="text-sm font-bold text-adify-action hover:underline">
          ← Back to discovery
        </Link>

        {isOwner && event.status !== 'published' && (
          <p role="status" className="mt-3 rounded-md bg-adify-wash px-4 py-3 text-sm font-medium">
            This listing is <strong>{event.status}</strong> and visible only to you.{' '}
            <Link href={`/dashboard/events/${event.id}`} className="font-bold text-adify-action hover:underline">
              Manage it in your dashboard
            </Link>
            .
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="overflow-hidden rounded-lg border border-adify-line bg-white">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- route-served covers (no remote-image config needed)
                <img src={cover} alt="" className="aspect-video w-full object-cover" />
              ) : (
                <div aria-hidden className="flex aspect-video w-full items-center justify-center bg-adify-mist">
                  <span className="text-6xl font-bold text-adify-action/40">
                    {(event.title.trim()[0] ?? 'A').toUpperCase()}
                  </span>
                </div>
              )}
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap gap-1.5">
                  {life === 'happening' && (
                    <span className="inline-flex items-center gap-1 rounded bg-adify-action px-2 py-0.5 text-xs font-bold text-white">
                      <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-white" /> Happening Now
                    </span>
                  )}
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">
                    {event.class === 'ceremony' ? 'Ceremony' : 'Event'}
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">{event.category}</span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">
                    {event.attendance === 'physical' ? 'Physical' : event.attendance === 'online' ? 'Online' : 'Hybrid'}
                  </span>
                  <span className="rounded bg-adify-wash px-2 py-0.5 text-xs font-medium">
                    {event.pricing === 'paid'
                      ? `Paid${minor !== null ? ` · ${formatMoneyMinor(minor, event.currency)}` : ''}`
                      : 'Free'}
                  </span>
                  {left !== null && (
                    <span className="rounded bg-adify-wash px-2 py-0.5 text-xs font-medium">
                      Limited · {left} left
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{event.title}</h1>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-adify-muted">
                  <Icon name="location" /> {location}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-adify-muted">
                  <Icon name="clock" /> {formatEventDateTime(event.startAt, event.timezone)}
                </p>
                <p className="mt-1 text-sm text-adify-muted">By {names[event.ownerId] ?? 'Organizer'}</p>
              </div>
            </div>

            <Section title="About">
              <ReadMore text={event.description} />
            </Section>

            <Section title="Schedule">
              <dl>
                <Row label="Starts" value={formatEventDateTime(event.startAt, event.timezone)} />
                <Row label="Ends" value={formatEventDateTime(event.endAt, event.timezone)} />
                <Row label="Timezone" value={event.timezone} />
                {event.registrationDeadline && (
                  <Row label="Book by" value={formatEventDateTime(event.registrationDeadline, event.timezone)} />
                )}
              </dl>
            </Section>

            {(event.attendance === 'physical' || event.attendance === 'hybrid') && (
              <Section title="Venue">
                <dl>
                  {event.venueName && <Row label="Venue" value={event.venueName} />}
                  <Row label="Place" value={[event.city, countryInfo?.name ?? event.country].filter(Boolean).join(', ') || '—'} />
                  {event.address && <Row label="Address" value={event.address} />}
                  {event.directions && <Row label="Directions" value={event.directions} />}
                  {event.accessibility && <Row label="Accessibility" value={event.accessibility} />}
                </dl>
              </Section>
            )}

            {(event.attendance === 'online' || event.attendance === 'hybrid') && (
              <Section title="Online attendance">
                <dl>
                  {event.onlinePlatform && <Row label="Platform" value={event.onlinePlatform} />}
                  <Row
                    label="Access"
                    value={
                      canSeeAccess
                        ? event.onlineAccess || '—'
                        : 'Shared with confirmed attendees only. Book a spot to receive access details.'
                    }
                  />
                </dl>
              </Section>
            )}

            {event.programItems.length > 0 && (
              <Section title="Program">
                <ul className="space-y-2">
                  {event.programItems.map((p) => (
                    <li key={p.id} className="rounded-md bg-adify-mist px-3 py-2">
                      <p className="font-bold">{p.title}</p>
                      {p.detail && <p className="text-adify-muted">{p.detail}</p>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Policies & contact">
              <dl>
                <Row label="Cancellation" value={event.cancellationPolicy || '—'} />
                {event.refundTerms && <Row label="Refunds" value={event.refundTerms} />}
                {event.attendanceRules && <Row label="Attendance" value={event.attendanceRules} />}
                {event.eligibility && <Row label="Eligibility" value={event.eligibility} />}
                <Row label="Organizer" value={event.organizerContact || (names[event.ownerId] ?? '—')} />
              </dl>
            </Section>
          </div>

          <aside className="lg:col-span-1" aria-label="Booking">
            <div className="rounded-lg border border-adify-line bg-white p-4 sm:sticky sm:top-20">
              {ended ? (
                <p role="status" className="rounded-md bg-gray-100 px-3 py-3 text-center text-sm font-bold">
                  {life === 'completed' ? 'This event has ended.' : 'This event was cancelled.'}
                </p>
              ) : (
                <>
                  <h2 className="text-lg font-bold">Attendance</h2>
                  <dl className="mb-3 mt-1 text-sm">
                    <Row label="Format" value={event.attendance} />
                    <Row
                      label="Price"
                      value={event.pricing === 'paid' && minor !== null ? formatMoneyMinor(minor, event.currency) : 'Free'}
                    />
                    {left !== null && <Row label="Spots left" value={String(left)} />}
                    {existing && <Row label="Your booking" value={`${existing.reference} · ${existing.status}`} />}
                  </dl>
                  {isOwner ? (
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-adify-action px-4 py-3 text-base font-bold text-white hover:bg-adify-action-dark"
                    >
                      <Icon name="settings" className="text-white" /> Manage this listing
                    </Link>
                  ) : (
                    <BookingForm eventId={event.id} action={action} maxSpots={event.spotsPerBooking} authed={Boolean(user)} />
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
