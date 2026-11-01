import Link from 'next/link';

// Static header for error/loading boundaries: no data fetching, safe to
// bundle anywhere including client-side error UI.
export function MinimalHeader() {
  return (
    <header className="border-b border-adify-line bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-3 px-4 py-2">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="ADIFY home">
          <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-adify-action text-lg font-bold text-white">
            A
          </span>
          <span className="text-xl font-bold tracking-tight">ADIFY</span>
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  // No new Date()/Date.now() here: this footer prerenders on static pages.
  const cols: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: 'Discover',
      links: [
        { href: '/discover', label: 'All events' },
        { href: '/discover?time=happening', label: 'Happening now' },
        { href: '/discover?time=upcoming', label: 'Upcoming' },
        { href: '/discover?pricing=free', label: 'Free events' },
        { href: '/discover?class=ceremony', label: 'Ceremonies' },
      ],
    },
    {
      title: 'Organizers',
      links: [
        { href: '/dashboard/events/new', label: 'Post an Event' },
        { href: '/dashboard/events', label: 'My Events' },
        { href: '/dashboard/bookings', label: 'My Bookings' },
        { href: '/dashboard', label: 'Dashboard' },
      ],
    },
    {
      title: 'Account',
      links: [
        { href: '/auth?mode=login', label: 'Sign in' },
        { href: '/auth?mode=register', label: 'Register' },
        { href: '/dashboard/profile', label: 'Profile & Settings' },
        { href: '/dashboard/help', label: 'Help & Support' },
      ],
    },
  ];
  return (
    <footer className="mt-12 bg-adify-action-dark text-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-lg font-bold">ADIFY</p>
          <p className="mt-1 max-w-xs text-sm text-white/80">
            Public events and ceremonies across Africa — live availability,
            real organizers.
          </p>
        </div>
        {cols.map((col) => (
          <nav key={col.title} aria-label={`Footer — ${col.title}`}>
            <p className="text-sm font-bold">{col.title}</p>
            <ul className="mt-2 space-y-1.5">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-sm text-white/80 hover:text-white hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-white/70 sm:flex-row sm:items-center">
          <p>© ADIFY. All listings are published by their organizers.</p>
          <p className="sm:ml-auto">Live availability · Real organizers</p>
        </div>
      </div>
    </footer>
  );
}
