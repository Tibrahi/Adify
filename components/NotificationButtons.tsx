'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markAllNotificationsAction, markNotificationAction } from '@/lib/actions';

export function MarkReadButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markNotificationAction(id);
          router.refresh();
        })
      }
      className="min-h-10 text-sm font-bold text-adify-action hover:underline disabled:opacity-60"
    >
      {pending ? '…' : 'Mark read'}
    </button>
  );
}

export function MarkAllButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markAllNotificationsAction();
          router.refresh();
        })
      }
      className="inline-flex min-h-10 items-center rounded-md border border-adify-line px-3 py-2 text-sm font-bold hover:border-adify-action disabled:opacity-60"
    >
      {pending ? 'Working…' : 'Mark all read'}
    </button>
  );
}
