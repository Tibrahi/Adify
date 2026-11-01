import { SkeletonGrid } from '@/components/States';
import { MinimalHeader, SiteFooter } from '@/components/MinimalHeader';

export default function Loading() {
  return (
    <>
      <MinimalHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-6" aria-label="Loading">
        <div className="h-8 w-2/3 animate-pulse rounded bg-adify-mist" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-adify-mist" />
        <div className="mt-4 h-12 animate-pulse rounded-md bg-adify-mist" />
        <div className="mt-6">
          <SkeletonGrid />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
