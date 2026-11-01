import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatInTimeZone } from 'date-fns-tz';
import { EventWizard } from '@/components/EventWizard';
import { updateEventAction, type ActionResult } from '@/lib/actions';
import { getCurrentUser } from '@/lib/auth';
import { ALL_COUNTRIES } from '@/lib/countries';
import { getEventById } from '@/lib/repo';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id).catch(() => null);
  return { title: event ? `Edit · ${event.title}` : 'Edit listing' };
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const event = await getEventById(id).catch(() => null);
  if (!event || event.ownerId !== user.id) notFound();
  if (event.status === 'cancelled' || event.status === 'suspended') notFound();

  const tz = event.timezone;
  const initialSchedule = {
    startDate: formatInTimeZone(new Date(event.startAt), tz, 'yyyy-MM-dd'),
    startTime: formatInTimeZone(new Date(event.startAt), tz, 'HH:mm'),
    endDate: formatInTimeZone(new Date(event.endAt), tz, 'yyyy-MM-dd'),
    endTime: formatInTimeZone(new Date(event.endAt), tz, 'HH:mm'),
    deadlineDate: event.registrationDeadline
      ? formatInTimeZone(new Date(event.registrationDeadline), tz, 'yyyy-MM-dd')
      : '',
    deadlineTime: event.registrationDeadline
      ? formatInTimeZone(new Date(event.registrationDeadline), tz, 'HH:mm')
      : '',
  };

  async function run(prev: ActionResult, fd: FormData): Promise<ActionResult> {
    'use server';
    return updateEventAction(id, prev, fd);
  }

  return (
    <div className="space-y-4">
      <Link href={`/dashboard/events/${id}`} className="text-sm font-bold text-adify-action hover:underline">
        ← Back to manage
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Edit listing</h1>
        <p className="mt-1 text-sm text-adify-muted">
          Changes to dates, venue, price, format or capacity notify confirmed attendees.
        </p>
      </div>
      <EventWizard
        mode="edit"
        initialEvent={event}
        initialSchedule={initialSchedule}
        countries={ALL_COUNTRIES}
        run={run}
      />
    </div>
  );
}
