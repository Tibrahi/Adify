import Link from 'next/link';
import { pageHref, type SearchParams } from '@/lib/discovery';

export function Pagination({
  sp,
  base,
  page,
  total,
  perPage,
}: {
  sp: SearchParams;
  base: string;
  page: number;
  total: number;
  perPage: number;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 ? (
        <Link
          href={pageHref(sp, base, page - 1)}
          className="inline-flex min-h-11 items-center rounded-md border border-adify-line px-4 py-2 text-sm font-bold hover:border-adify-action"
        >
          Previous
        </Link>
      ) : (
        <span aria-hidden className="inline-flex min-h-11 items-center rounded-md border border-adify-line px-4 py-2 text-sm text-adify-muted opacity-60">
          Previous
        </span>
      )}
      <span className="px-2 text-sm text-adify-muted" aria-current="page">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link
          href={pageHref(sp, base, page + 1)}
          className="inline-flex min-h-11 items-center rounded-md border border-adify-line px-4 py-2 text-sm font-bold hover:border-adify-action"
        >
          Next
        </Link>
      ) : (
        <span aria-hidden className="inline-flex min-h-11 items-center rounded-md border border-adify-line px-4 py-2 text-sm text-adify-muted opacity-60">
          Next
        </span>
      )}
    </nav>
  );
}
