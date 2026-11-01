import Link from 'next/link';
import { MarkAllButton, MarkReadButton } from '@/components/NotificationButtons';
import { EmptyState } from '@/components/States';
import { getCurrentUser } from '@/lib/auth';
import { formatRelative } from '@/lib/dates';
import { listUserNotifications } from '@/lib/repo';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const user = (await getCurrentUser())!;
  const notes = await listUserNotifications(user.id, 50).catch(() => []);
  const unread = notes.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unread > 0 && <MarkAllButton />}
      </div>
      {notes.length === 0 ? (
        <EmptyState
          title="No notifications"
          body="Booking updates, event changes and moderation decisions will appear here."
        />
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-4 ${n.readAt ? 'border-adify-line bg-white' : 'border-adify-action/40 bg-adify-mist'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className={n.readAt ? 'font-medium' : 'font-bold'}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-adify-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-adify-muted">{formatRelative(n.createdAt)}</p>
                </div>
                {!n.readAt && <MarkReadButton id={n.id} />}
              </div>
              {n.link && (
                <Link href={n.link} className="mt-2 inline-block text-sm font-bold text-adify-action hover:underline">
                  Open →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
