'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logoutAction } from '@/lib/actions';
import { Icon } from './Icon';

export function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="menuitem"
      disabled={pending}
      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-adify-mist disabled:opacity-60"
      onClick={() =>
        start(async () => {
          await logoutAction();
          router.push('/');
          router.refresh();
        })
      }
    >
      <Icon name="logout" /> {pending ? 'Signing out…' : 'Logout'}
    </button>
  );
}
