import { createImage, deleteImage } from './repo';

// Cover/poster storage without any object-store dependency: validated image
// bytes live in Neon PostgreSQL BYTEA (or sidecar blob files for the explicit
// local backend) and are served through the controlled /api/images/[id]
// route, which enforces the public-vs-owner visibility rules.

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

function sniffMime(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length > 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buf.length > 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buf.length > 6 && (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a')) {
    return 'image/gif';
  }
  return null;
}

export function validateImage(buf: Buffer, declared: string): { ext: string; mime: string } {
  if (buf.length === 0 || buf.length > MAX_BYTES) throw new Error('cover_too_large');
  const sniffed = sniffMime(buf);
  const ext = ALLOWED.get(declared);
  if (!ext || sniffed !== declared) throw new Error('cover_invalid_type');
  return { ext, mime: declared };
}

// Stores a validated cover and returns its image id (events.cover_key).
export async function saveCover(buf: Buffer, declaredMime: string, ownerId: string): Promise<string> {
  const { mime } = validateImage(buf, declaredMime);
  const row = await createImage({ ownerId, mime, data: buf });
  return row.id;
}

export async function deleteCover(imageId: string, ownerId: string): Promise<void> {
  if (!imageId) return;
  try {
    await deleteImage(imageId, ownerId);
  } catch {
    // best-effort cleanup; replacement covers orphan safely
  }
}

// Display URL for an event cover: legacy /uploads/* URLs keep working
// (existing files are preserved on disk); new covers resolve to the
// controlled image route; events without covers return ''.
export function coverDisplayUrl(event: { coverKey: string; coverUrl: string }): string {
  if (event.coverUrl) return event.coverUrl;
  if (event.coverKey) return `/api/images/${encodeURIComponent(event.coverKey)}`;
  return '';
}
