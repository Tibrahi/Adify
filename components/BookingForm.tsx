'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { bookingAction, type ActionResult } from '@/lib/actions';
import { BOOKING_ACTION_LABELS } from '@/lib/events';
import type { BookingAction } from '@/lib/types';
import { Icon } from './Icon';

const initial: ActionResult = { ok: false };

function SubmitButton({ action, pending }: { action: BookingAction; pending: boolean }) {
  const disabled =
    pending || action === 'closed' || action === 'soldout' || action === 'ended' || action === 'cancelled';
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-adify-action px-4 py-3 text-base font-bold text-white hover:bg-adify-action-dark disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-adify-muted"
    >
      <Icon name="booking" className={disabled ? 'text-adify-muted' : 'text-white'} />
      {pending ? 'Processing…' : BOOKING_ACTION_LABELS[action]}
    </button>
  );
}

// Booking panel for the event details page. The server decides the action;
// this form only submits the requested spot count.
export function BookingForm({
  eventId,
  action,
  maxSpots,
  authed,
}: {
  eventId: string;
  action: BookingAction;
  maxSpots: number;
  authed: boolean;
}) {
  const bound = bookingAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(bound, initial);
  const router = useRouter();
  useEffect(() => {
    if (state.ok && state.redirect) {
      router.push(state.redirect);
      router.refresh();
    }
  }, [state, router]);

  if (action === 'manage') {
    return (
      <Link
        href="/dashboard/bookings"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-adify-action px-4 py-3 text-base font-bold text-white hover:bg-adify-action-dark"
      >
        <Icon name="bookings" className="text-white" /> View My Booking
      </Link>
    );
  }

  if (!authed) {
    const label = BOOKING_ACTION_LABELS[action];
    const terminal = action === 'closed' || action === 'soldout' || action === 'ended' || action === 'cancelled';
    if (terminal) {
      return (
        <button type="button" disabled className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-md bg-gray-300 px-4 py-3 text-base font-bold text-adify-muted">
          {label}
        </button>
      );
    }
    return (
      <Link
        href={`/auth?mode=login&next=${encodeURIComponent(`/events/${eventId}`)}`}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-adify-action px-4 py-3 text-base font-bold text-white hover:bg-adify-action-dark"
      >
        <Icon name="login" className="text-white" /> {label} — Sign in
      </Link>
    );
  }

  const showSpots = action === 'request' || action === 'reserve' || action === 'waitlist';

  return (
    <form action={formAction} className="space-y-3">
      {showSpots && maxSpots > 1 && (
        <div>
          <label htmlFor="spots" className="mb-1 block text-sm font-medium">
            Spots (max {maxSpots})
          </label>
          <select
            id="spots"
            name="spots"
            defaultValue="1"
            className="min-h-11 w-full rounded-md border border-adify-line bg-white px-3 py-2 text-sm"
          >
            {Array.from({ length: maxSpots }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}
      {state.error && state.error !== 'auth_required' && (
        <p role="alert" className="rounded-md bg-adify-error/10 px-3 py-2 text-sm font-medium text-adify-error">
          {state.error}
        </p>
      )}
      <SubmitButton action={action} pending={pending} />
      {(action === 'request' || action === 'waitlist') && (
        <p className="text-xs text-adify-muted">
          {action === 'request'
            ? 'A request is not a confirmed reservation — the organizer reviews it first.'
            : 'You will be notified if a spot opens up.'}
        </p>
      )}
    </form>
  );
}
