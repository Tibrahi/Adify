'use client';

import { MinimalHeader, SiteFooter } from '@/components/MinimalHeader';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <MinimalHeader />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-8 pt-10">
        <div className="rounded-lg border border-adify-error/30 bg-white px-6 py-10 text-center" role="alert">
          <h1 className="text-xl font-bold text-adify-error">Something went wrong</h1>
          <p className="mx-auto mt-1 max-w-md text-sm text-adify-muted">
            We could not load this page. Your data is safe — please try again.
          </p>
          {error.digest && <p className="mt-2 text-xs text-adify-muted">Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark"
          >
            Try again
          </button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
