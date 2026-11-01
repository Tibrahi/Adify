import Link from 'next/link';
import { MinimalHeader, SiteFooter } from '@/components/MinimalHeader';

export default function NotFound() {
  return (
    <>
      <MinimalHeader />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-adify-muted">
          This page does not exist or the listing was removed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark"
        >
          Back to home
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
