import { NextResponse } from 'next/server';
import { eventPriceMinor } from '@/lib/dates';
import { parseFilters } from '@/lib/discovery';
import { getOwnerNames, listEvents } from '@/lib/repo';
import { coverDisplayUrl } from '@/lib/storage';

// Public discovery API. Always restricted to eligible listings and public
// fields only — drafts, private access details and contacts never leak here.
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sp: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      sp[k] = v;
    });
    const filters = parseFilters(sp);
    const limit = Math.min(Math.max(Number(sp.limit) || 24, 1), 100);
    const offset = Math.max(Number(sp.offset) || 0, 0);
    const { items, total } = await listEvents({ ...filters, eligibleOnly: true, limit, offset });
    const names = await getOwnerNames(items.map((e) => e.ownerId));
    const pub = items.map((e) => ({
      id: e.id,
      title: e.title,
      class: e.class,
      category: e.category,
      description: e.description.slice(0, 300),
      coverUrl: coverDisplayUrl(e),
      startAt: e.startAt,
      endAt: e.endAt,
      timezone: e.timezone,
      attendance: e.attendance,
      city: e.city,
      country: e.country,
      venueName: e.venueName,
      pricing: e.pricing,
      priceMinor: eventPriceMinor(e),
      currency: e.currency,
      capacityType: e.capacityType,
      organizer: names[e.ownerId] ?? '',
    }));
    return NextResponse.json({ items: pub, total, limit, offset });
  } catch {
    return NextResponse.json({ error: 'Discovery is temporarily unavailable.' }, { status: 503 });
  }
}
