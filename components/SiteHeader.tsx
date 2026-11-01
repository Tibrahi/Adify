import Link from 'next/link';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { AFRICAN_COUNTRIES } from '@/lib/countries';
import { distinctCountries } from '@/lib/repo';
import { Icon } from './Icon';
import { LocationPicker, MobileMenu, ProfileMenu } from './HeaderControls';
import { LogoutButton } from './LogoutButton';

function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="ADIFY home">
      <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-adify-action text-lg font-bold text-white">
        A
      </span>
      <span className="text-xl font-bold tracking-tight">ADIFY</span>
    </Link>
  );
}

export async function SiteHeader() {
  const [user, eligible, cookieStore] = await Promise.all([
    getCurrentUser(),
    distinctCountries().catch(() => [] as string[]),
    cookies(),
  ]);
  const currentCountry = cookieStore.get('adify_country')?.value ?? '';
  const postHref = user ? '/dashboard/events/new' : `/auth?mode=register&next=${encodeURIComponent('/dashboard/events/new')}`;

  const authedMenu = user ? (
    <ProfileMenu
      name={user.fullName}
      extra={
        <>
          <Link role="menuitem" href="/dashboard" className="block px-4 py-2 text-sm hover:bg-adify-mist">
            Dashboard
          </Link>
          <Link role="menuitem" href="/dashboard/bookings" className="block px-4 py-2 text-sm hover:bg-adify-mist">
            My Bookings
          </Link>
          <Link role="menuitem" href="/dashboard/events" className="block px-4 py-2 text-sm hover:bg-adify-mist">
            My Events
          </Link>
          <Link role="menuitem" href="/dashboard/profile" className="block px-4 py-2 text-sm hover:bg-adify-mist">
            Profile & Settings
          </Link>
          <div className="border-t border-adify-line">
            <LogoutButton />
          </div>
        </>
      }
    />
  ) : null;

  return (
    <header className="sticky top-0 z-30 border-b border-adify-line bg-white/95 backdrop-blur">
      <div className="relative mx-auto flex min-h-16 w-full max-w-6xl items-center gap-3 px-4 py-2">
        <Logo />
        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Primary">
          <Link href="/discover" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-adify-mist">
            <Icon name="search" /> Discover
          </Link>
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <LocationPicker eligible={eligible} africans={AFRICAN_COUNTRIES} current={currentCountry} />
          {user ? (
            authedMenu
          ) : (
            <>
              <Link href="/auth?mode=login" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-adify-mist">
                <Icon name="login" /> Sign in
              </Link>
              <Link href="/auth?mode=register" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-adify-mist">
                <Icon name="register" /> Register
              </Link>
            </>
          )}
          <Link href={postHref} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark">
            <Icon name="create" className="text-white" /> Post an Event
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <Link href="/discover" aria-label="Search events" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-adify-line px-3">
            <Icon name="search" label="Search events" />
          </Link>
          <MobileMenu>
            <div className="flex flex-col gap-2">
              <LocationPicker eligible={eligible} africans={AFRICAN_COUNTRIES} current={currentCountry} />
              <Link href="/discover" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-adify-mist">
                <Icon name="search" /> Discover events
              </Link>
              {user ? (
                <>
                  <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-adify-mist">
                    <Icon name="home" /> Dashboard
                  </Link>
                  <Link href="/dashboard/bookings" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-adify-mist">
                    <Icon name="bookings" /> My Bookings
                  </Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/auth?mode=login" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-adify-mist">
                    <Icon name="login" /> Sign in
                  </Link>
                  <Link href="/auth?mode=register" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-adify-mist">
                    <Icon name="register" /> Register
                  </Link>
                </>
              )}
              <Link href={postHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark">
                <Icon name="create" className="text-white" /> Post an Event
              </Link>
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
