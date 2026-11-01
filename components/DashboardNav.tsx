'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './Icon';
import { LogoutButton } from './LogoutButton';

const ITEMS: { href: string; label: string; icon: IconName; match: string }[] = [
  { href: '/dashboard', label: 'Overview', icon: 'home', match: '/dashboard' },
  { href: '/discover', label: 'Discover Events', icon: 'search', match: '/discover' },
  { href: '/dashboard/bookings', label: 'My Bookings', icon: 'bookings', match: '/dashboard/bookings' },
  { href: '/dashboard/events', label: 'My Events', icon: 'calendar', match: '/dashboard/events' },
  { href: '/dashboard/events/new', label: 'Create Event', icon: 'create', match: '/dashboard/events/new' },
  { href: '/dashboard/notifications', label: 'Notifications', icon: 'notifications', match: '/dashboard/notifications' },
  { href: '/dashboard/profile', label: 'Profile & Settings', icon: 'settings', match: '/dashboard/profile' },
  { href: '/dashboard/help', label: 'Help & Support', icon: 'help', match: '/dashboard/help' },
];

function NavList({ unread, onNavigate }: { unread: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (item: (typeof ITEMS)[number]) =>
    item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.match);
  return (
    <nav aria-label="Dashboard">
      <ul className="space-y-1">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive(item) ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                isActive(item) ? 'bg-adify-wash font-bold' : 'hover:bg-adify-mist'
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
              {item.href === '/dashboard/notifications' && unread > 0 && (
                <span className="ml-auto rounded-full bg-adify-action px-2 py-0.5 text-xs font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
          </li>
        ))}
        <li className="border-t border-adify-line pt-1">
          <LogoutButton />
        </li>
      </ul>
    </nav>
  );
}

export function DashboardNav({ userName, unread }: { userName: string; unread: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center gap-2 border-b border-adify-line bg-white px-4 py-2 lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="ADIFY home">
          <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-adify-action text-lg font-bold text-white">
            A
          </span>
          <span className="text-lg font-bold">ADIFY</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close dashboard menu' : 'Open dashboard menu'}
          className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-adify-line px-3"
        >
          <Icon name={open ? 'close' : 'menu'} label={open ? 'Close menu' : 'Open menu'} />
        </button>
      </div>
      {open && (
        <div className="border-b border-adify-line bg-white px-4 py-3 lg:hidden">
          <NavList unread={unread} onNavigate={() => setOpen(false)} />
        </div>
      )}
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-64 lg:border-r lg:border-adify-line lg:bg-white" aria-label="Dashboard sidebar">
        <div className="max-h-dvh overflow-auto p-4">
          <Link href="/" className="mb-4 inline-flex items-center gap-2 px-1" aria-label="ADIFY home">
            <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-adify-action text-lg font-bold text-white">
              A
            </span>
            <span className="text-xl font-bold">ADIFY</span>
          </Link>
          <p className="mb-3 truncate px-1 text-sm text-adify-muted">Signed in as {userName}</p>
          <NavList unread={unread} />
        </div>
      </aside>
    </>
  );
}
