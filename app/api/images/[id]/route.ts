import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getEventByCoverKey, getImageWithData } from '@/lib/repo';

// Controlled image serving. Covers of published public listings are public;
// anything else (drafts, unlisted, orphaned) requires the owning session.
// Responses are immutable (ids are unique per upload) for safe caching.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || id.length > 80) return new NextResponse('Not found', { status: 404 });
    const image = await getImageWithData(id).catch(() => null);
    if (!image || image.data.length === 0) return new NextResponse('Not found', { status: 404 });

    const event = await getEventByCoverKey(id).catch(() => null);
    const isPublic = Boolean(event && event.status === 'published' && event.publicListing);
    if (!isPublic) {
      const user = await getCurrentUser().catch(() => null);
      if (!user || user.id !== image.ownerId) {
        return new NextResponse('Not found', { status: 404 });
      }
    }
    return new NextResponse(new Uint8Array(image.data), {
      status: 200,
      headers: {
        'Content-Type': image.mime,
        'Content-Length': String(image.data.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
