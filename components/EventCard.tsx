import Link from 'next/link';
import { lifecycleOf, remainingSpots } from '@/lib/events';
import { formatCardDate, formatEventDateTime, formatMoneyMinor, eventPriceMinor } from '@/lib/dates';
import { coverDisplayUrl } from '@/lib/storage';
import { excerpt } from '@/lib/util';
import type { DbEvent } from '@/lib/types';
import { Icon } from './Icon';

function Badge({ children, tone }: { children: React.ReactNode; tone: 'live' | 'plain' | 'green' }) {
  const styles =
    tone === 'live'
      ? 'bg-adify-action text-white'
      : tone === 'green'
        ? 'bg-adify-wash text-adify-ink'
        : 'bg-gray-100 text-adify-ink';
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}

export function EventCard({
  event,
  ownerName,
  used,
  eager,
}: {
  event: DbEvent;
  ownerName: string;
  used: number;
  eager?: boolean;
}) {
  const life = lifecycleOf(event);
  const date = formatCardDate(event.startAt, event.timezone);
  const left = remainingSpots(event, used);
  const cover = coverDisplayUrl(event);
  const minor = eventPriceMinor(event);
  const location =
    event.attendance === 'online'
      ? 'Online'
      : [event.city, event.country].filter(Boolean).join(', ') || 'Venue announced soon';

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-adify-line bg-white transition-shadow hover:shadow-md"
      aria-label={`${event.title}, ${formatEventDateTime(event.startAt, event.timezone)}`}
    >
      <div className="card-cover relative w-full overflow-hidden">
        {cover ? (
          // Plain img keeps database-served and legacy covers working without
          // remote-image config; aspect-ratio box prevents layout shift.
          // eslint-disable-next-line @next/next/no-img-element -- route-served covers with lazy loading + CLS-safe box
          <img
            src={cover}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div aria-hidden className="flex h-full w-full items-center justify-center bg-adify-mist">
            <span className="text-4xl font-bold text-adify-action/40">
              {(event.title.trim()[0] ?? 'A').toUpperCase()}
            </span>
          </div>
        )}
        {life === 'happening' && (
          <span className="absolute left-2 top-2">
            <Badge tone="live">
              <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-white" /> Happening Now
            </Badge>
          </span>
        )}
      </div>
      <div className="flex flex-1 gap-3 p-3">
        <div aria-hidden className="flex h-fit w-12 shrink-0 flex-col items-center rounded-md bg-adify-mist px-1 py-1.5">
          <span className="text-lg font-bold leading-none">{date.day}</span>
          <span className="text-xs font-medium uppercase">{date.month}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-adify-muted">
            {event.class === 'ceremony' ? 'Ceremony' : 'Event'} · {event.category}
          </p>
          <h3 className="clamp-2 mt-0.5 text-base font-bold leading-snug group-hover:underline">
            {event.title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-adify-muted">
            <Icon name="location" />
            <span className="truncate">{location}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-adify-muted">
            <Icon name="clock" />
            <span className="truncate">{formatEventDateTime(event.startAt, event.timezone)}</span>
          </p>
          {event.description && (
            <p className="clamp-2 mt-1 text-sm text-adify-muted">{excerpt(event.description)}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="plain">{event.attendance === 'physical' ? 'Physical' : event.attendance === 'online' ? 'Online' : 'Hybrid'}</Badge>
            {event.pricing === 'paid' ? (
              <Badge tone="plain">
                Paid{minor !== null ? ` · ${formatMoneyMinor(minor, event.currency)}` : ''}
              </Badge>
            ) : (
              <Badge tone="green">Free</Badge>
            )}
            {left !== null && <Badge tone="green">Limited · {left} left</Badge>}
          </div>
          {ownerName && (
            <p className="mt-2 truncate text-xs text-adify-muted">By {ownerName}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function EventGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
