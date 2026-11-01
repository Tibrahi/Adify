import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  claimOutboxJob,
  enqueueOutbox,
  listOutbox,
  markOutboxFailed,
  markOutboxRetry,
  markOutboxSent,
} from '../lib/repo';
import { outboxBackoffSec } from '../lib/email';
import { cleanupDb, isolateDb } from './helpers';

const file = isolateDb('outbox');
after(() => cleanupDb(file));

describe('durable email outbox', () => {
  it('deduplicates by idempotency key', async () => {
    const first = await enqueueOutbox({
      key: 'test:dedupe:1',
      to: 'a@example.com',
      subject: 'Hi',
      text: 'hello',
      html: '',
    });
    const second = await enqueueOutbox({
      key: 'test:dedupe:1',
      to: 'a@example.com',
      subject: 'Hi',
      text: 'hello',
      html: '',
    });
    assert.equal(first.id, second.id);
    assert.equal(first.status, 'queued');
  });

  it('claims atomically: the second claim loses', async () => {
    const job = await enqueueOutbox({
      key: 'test:claim:1',
      to: 'b@example.com',
      subject: 'Hi',
      text: 'hello',
      html: '',
    });
    const claimed = await claimOutboxJob(job.id);
    assert.ok(claimed);
    assert.equal(claimed?.status, 'sending');
    assert.equal(claimed?.attempts, 1);
    assert.equal(await claimOutboxJob(job.id), null);
  });

  it('transitions through retry with backoff, then sent or failed', async () => {
    const job = await enqueueOutbox({
      key: 'test:retry:1',
      to: 'c@example.com',
      subject: 'Hi',
      text: 'hello',
      html: '',
    });
    await claimOutboxJob(job.id);
    await markOutboxRetry(job.id, 'smtp refused', outboxBackoffSec(1));
    const [listed] = await listOutbox('retry');
    assert.ok(listed && Date.parse(listed.nextAttemptAt) > Date.now());
    assert.equal(listed.lastError, 'smtp refused');
    // Still in backoff: not claimable again yet.
    assert.equal(await claimOutboxJob(job.id), null);

    const ready = await enqueueOutbox({
      key: 'test:sent:1',
      to: 'e@example.com',
      subject: 'Hi',
      text: 'hello',
      html: '',
    });
    await claimOutboxJob(ready.id);
    await markOutboxSent(ready.id);
    const [sent] = await listOutbox('sent');
    assert.ok(sent && sent.id === ready.id && sent.sentAt);

    const doomed = await enqueueOutbox({
      key: 'test:fail:1',
      to: 'd@example.com',
      subject: 'Hi',
      text: 'hello',
      html: '',
    });
    await claimOutboxJob(doomed.id);
    await markOutboxFailed(doomed.id, 'permanent bounce');
    const [failed] = await listOutbox('failed');
    assert.equal(failed?.id, doomed.id);
  });

  it('computes bounded exponential backoff', () => {
    assert.equal(outboxBackoffSec(1), 60);
    assert.equal(outboxBackoffSec(2), 120);
    assert.equal(outboxBackoffSec(3), 240);
    assert.equal(outboxBackoffSec(100), 6 * 3600);
  });
});
