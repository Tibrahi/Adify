import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createImage,
  deleteImage,
  getEventByCoverKey,
  getImageWithData,
} from '../lib/repo';
import { coverDisplayUrl } from '../lib/storage';
import { cleanupDb, isolateDb, makeEvent, makeUser } from './helpers';

const file = isolateDb('images');
after(() => cleanupDb(file));

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('database-backed images', () => {
  it('round-trips bytes with ownership metadata', async () => {
    const owner = await makeUser({ email: `img-own-${Date.now()}@example.com` });
    const row = await createImage({ ownerId: owner.id, mime: 'image/png', data: PNG });
    assert.equal(row.mime, 'image/png');
    assert.equal(row.size, PNG.length);
    const back = await getImageWithData(row.id);
    assert.ok(back);
    assert.ok(back?.data.equals(PNG));
    assert.equal(await getImageWithData('missing'), null);
  });

  it('deletes only for the owning user', async () => {
    const owner = await makeUser({ email: `img-del-${Date.now()}@example.com` });
    const stranger = await makeUser({ email: `img-str-${Date.now()}@example.com` });
    const row = await createImage({ ownerId: owner.id, mime: 'image/png', data: PNG });
    assert.equal(await deleteImage(row.id, stranger.id), false);
    assert.ok(await getImageWithData(row.id));
    assert.equal(await deleteImage(row.id, owner.id), true);
    assert.equal(await getImageWithData(row.id), null);
  });

  it('links covers to events and resolves display URLs', async () => {
    const owner = await makeUser({ email: `img-ev-${Date.now()}@example.com` });
    const row = await createImage({ ownerId: owner.id, mime: 'image/png', data: PNG });
    const event = await makeEvent(owner.id, { title: 'Cover Link Test', coverKey: row.id, coverUrl: '' });
    assert.equal((await getEventByCoverKey(row.id))?.id, event.id);
    assert.equal(coverDisplayUrl(event), `/api/images/${row.id}`);
    assert.equal(coverDisplayUrl({ coverKey: '', coverUrl: '/uploads/legacy/x.png' }), '/uploads/legacy/x.png');
    assert.equal(coverDisplayUrl({ coverKey: '', coverUrl: '' }), '');
  });
});
