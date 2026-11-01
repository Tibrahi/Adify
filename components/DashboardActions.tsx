'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  cancelBookingAction,
  cancelEventAction,
  decideBookingAction,
  publishEventAction,
  unpublishEventAction,
  type ActionResult,
} from '@/lib/actions';

const initial: ActionResult = { ok: false };

type Runner = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

// Two-step destructive form: first click arms, second click submits.
function ConfirmForm({
  run,
  idleLabel,
  confirmLabel,
  tone,
}: {
  run: Runner;
  idleLabel: string;
  confirmLabel: string;
  tone: 'danger' | 'action';
}) {
  const [armed, setArmed] = useState(false);
  const [state, formAction, pending] = useActionState(run, initial);
  const router = useRouter();
  useEffect(() => {
    if (state.ok && state.redirect) {
      router.push(state.redirect);
      router.refresh();
    } else if (state.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      className="inline-flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
        }
      }}
    >
      {state.error && (
        <span role="alert" className="w-full text-sm font-medium text-adify-error">
          {state.error}
        </span>
      )}
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-bold disabled:opacity-60 ${
          tone === 'danger'
            ? 'bg-adify-error/10 text-adify-error hover:bg-adify-error/20'
            : 'bg-adify-action text-white hover:bg-adify-action-dark'
        }`}
      >
        {pending ? 'Working…' : armed ? confirmLabel : idleLabel}
      </button>
      {armed && !pending && (
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="inline-flex min-h-10 items-center rounded-md border border-adify-line px-3 py-2 text-sm font-medium hover:border-adify-action"
        >
          Keep
        </button>
      )}
    </form>
  );
}

export function CancelBookingButton({ id }: { id: string }) {
  const run: Runner = async () => cancelBookingAction(id);
  return <ConfirmForm run={run} idleLabel="Cancel booking" confirmLabel="Confirm cancellation" tone="danger" />;
}

export function DecideButtons({ id }: { id: string }) {
  const approve: Runner = async () => decideBookingAction(id, 'approve');
  const decline: Runner = async () => decideBookingAction(id, 'decline');
  return (
    <span className="inline-flex flex-wrap gap-2">
      <ConfirmForm run={approve} idleLabel="Approve" confirmLabel="Confirm approval" tone="action" />
      <ConfirmForm run={decline} idleLabel="Decline" confirmLabel="Confirm decline" tone="danger" />
    </span>
  );
}

export function PublishButton({ id }: { id: string }) {
  const run: Runner = async () => publishEventAction(id);
  return <ConfirmForm run={run} idleLabel="Publish" confirmLabel="Confirm publish" tone="action" />;
}

export function UnpublishButton({ id }: { id: string }) {
  const run: Runner = async () => unpublishEventAction(id);
  return <ConfirmForm run={run} idleLabel="Unpublish" confirmLabel="Confirm unpublish" tone="danger" />;
}

export function CancelEventButton({ id }: { id: string }) {
  const run: Runner = async () => cancelEventAction(id);
  return <ConfirmForm run={run} idleLabel="Cancel event" confirmLabel="Confirm cancellation" tone="danger" />;
}
