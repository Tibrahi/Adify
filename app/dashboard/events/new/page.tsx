import { EventWizard } from '@/components/EventWizard';
import { createEventAction, type ActionResult } from '@/lib/actions';
import { ALL_COUNTRIES } from '@/lib/countries';

export const metadata = { title: 'Post an Event' };

async function run(prev: ActionResult, fd: FormData): Promise<ActionResult> {
  'use server';
  return createEventAction(prev, fd);
}

export default function NewEventPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Post an Event</h1>
        <p className="mt-1 text-sm text-adify-muted">
          Fill in the details below. You can save a draft at any point before publishing.
        </p>
      </div>
      <EventWizard mode="create" countries={ALL_COUNTRIES} run={run} />
    </div>
  );
}
