import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/DashboardNav';
import { getCurrentUser } from '@/lib/auth';
import { unreadNotificationCount } from '@/lib/repo';

// Session-gated routes must block on authentication (covers all children).
export const instant = false;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect('/auth?mode=login&next=%2Fdashboard');
  const unread = await unreadNotificationCount(user.id).catch(() => 0);
  return (
    <div className="min-h-dvh bg-adify-bg">
      <DashboardNav userName={user.fullName} unread={unread} />
      <div className="lg:pl-64">
        <main id="main" className="mx-auto w-full max-w-5xl px-4 py-6 lg:-ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}
