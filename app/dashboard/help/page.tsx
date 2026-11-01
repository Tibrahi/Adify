import { SupportForm } from '@/components/SupportForm';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Help & Support' };

export default async function HelpPage() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Help & Support</h1>
        <p className="mt-1 text-sm text-adify-muted">
          Questions about a booking, publishing, or your account? Send us a message.
        </p>
      </div>
      <div className="rounded-lg border border-adify-line bg-white p-4">
        <SupportForm defaultName={user?.fullName ?? ''} defaultEmail={user?.email ?? ''} />
      </div>
    </div>
  );
}
