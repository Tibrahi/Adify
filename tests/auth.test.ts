import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashCode, hashPassword, rateLimit, verifyPassword } from '../lib/password';
import {
  bumpCodeAttempts,
  consumeCode,
  countRecentCodes,
  createCode,
  createSession,
  createUser,
  deleteSession,
  getLatestCode,
  getSession,
  getUserByEmail,
  getUserById,
  updateUser,
} from '../lib/repo';
import { cleanupDb, isolateDb } from './helpers';

const file = isolateDb('auth');
after(() => cleanupDb(file));

describe('password hashing', () => {
  it('hashes and verifies, rejects wrong passwords', async () => {
    const hash = await hashPassword('Str0ng-pass');
    assert.notEqual(hash, 'Str0ng-pass');
    assert.equal(await verifyPassword('Str0ng-pass', hash), true);
    assert.equal(await verifyPassword('wrong-pass', hash), false);
    assert.equal(await verifyPassword('Str0ng-pass', 'garbage'), false);
  });

  it('produces unique salts', async () => {
    const a = await hashPassword('same-password1');
    const b = await hashPassword('same-password1');
    assert.notEqual(a, b);
  });
});

describe('rate limiting', () => {
  it('allows up to the limit then blocks within the window', () => {
    const key = `test-${Date.now()}`;
    assert.equal(rateLimit(key, 2, 60_000).allowed, true);
    assert.equal(rateLimit(key, 2, 60_000).allowed, true);
    const third = rateLimit(key, 2, 60_000);
    assert.equal(third.allowed, false);
    assert.ok(third.retryAfterSec > 0);
  });
});

describe('users and sessions', () => {
  it('creates and fetches users by id and email (case-insensitive)', async () => {
    const user = await createUser({
      fullName: 'Auth Tester',
      email: 'auth.case@example.com',
      passwordHash: await hashPassword('Passw0rd!'),
      country: 'NG',
      phone: '',
    });
    assert.equal((await getUserById(user.id))?.email, 'auth.case@example.com');
    assert.equal((await getUserByEmail('AUTH.CASE@EXAMPLE.COM'))?.id, user.id);
    assert.equal(await getUserByEmail('nobody@example.com'), null);
  });

  it('updates profile fields without touching the password hash', async () => {
    const user = await createUser({
      fullName: 'Before',
      email: `before-${Date.now()}@example.com`,
      passwordHash: await hashPassword('Passw0rd!'),
      country: '',
      phone: '',
    });
    const updated = await updateUser(user.id, { fullName: 'After', country: 'GH' });
    assert.equal(updated?.fullName, 'After');
    assert.equal(updated?.country, 'GH');
    assert.equal(updated?.passwordHash, user.passwordHash);
  });

  it('creates, reads and deletes sessions', async () => {
    const user = await createUser({
      fullName: 'Session User',
      email: `sess-${Date.now()}@example.com`,
      passwordHash: await hashPassword('Passw0rd!'),
      country: '',
      phone: '',
    });
    const session = await createSession(user.id, 1);
    assert.ok(Date.parse(session.expiresAt) > Date.now());
    assert.equal((await getSession(session.token))?.userId, user.id);
    await deleteSession(session.token);
    assert.equal(await getSession(session.token), null);
  });
});

describe('verification codes', () => {
  it('tracks attempts, consumption and recent counts', async () => {
    const user = await createUser({
      fullName: 'Code User',
      email: `code-${Date.now()}@example.com`,
      passwordHash: await hashPassword('Passw0rd!'),
      country: '',
      phone: '',
    });
    await createCode({ userId: user.id, purpose: 'email_verify', codeHash: hashCode('123456'), ttlMinutes: 15 });
    const latest = await getLatestCode(user.id, 'email_verify');
    assert.ok(latest);
    assert.equal(latest?.attempts, 0);
    await bumpCodeAttempts(latest!.id);
    assert.equal((await getLatestCode(user.id, 'email_verify'))?.attempts, 1);
    assert.equal(await countRecentCodes(user.id, 60), 1);
    await consumeCode(latest!.id);
    assert.equal(await getLatestCode(user.id, 'email_verify'), null);
  });
});
