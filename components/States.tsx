import Link from 'next/link';
import { Icon } from './Icon';

export function CardSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-lg border border-adify-line bg-white">
      <div className="card-cover w-full animate-pulse bg-adify-mist" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-1/3 animate-pulse rounded bg-adify-mist" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-adify-mist" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-adify-mist" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Loading events">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-adify-line bg-white px-6 py-10 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-adify-muted">{body}</p>
      {actions && <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorState({ body, retryHref }: { body: string; retryHref: string }) {
  return (
    <div className="rounded-lg border border-adify-error/30 bg-white px-6 py-8 text-center" role="alert">
      <p className="inline-flex items-center gap-2 font-bold text-adify-error">
        <Icon name="warn" className="text-adify-error" /> Something went wrong
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-adify-muted">{body}</p>
      <a
        href={retryHref}
        className="mt-4 inline-flex min-h-11 items-center rounded-md bg-adify-action px-4 py-2 text-sm font-bold text-white hover:bg-adify-action-dark"
      >
        Retry
      </a>
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  viewAllHref,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-adify-muted">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Link href={viewAllHref} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-sm font-bold text-adify-action hover:underline">
          View All <Icon name="arrow" className="text-adify-action" />
        </Link>
      )}
    </div>
  );
}
