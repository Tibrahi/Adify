import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '../next.config';

describe('route redirects', () => {
  it('sends the unresolved /help path to the dashboard (not a 404)', async () => {
    assert.ok(typeof nextConfig.redirects === 'function');
    const rules = await nextConfig.redirects();
    const help = rules.find((r) => r.source === '/help');
    assert.ok(help, 'expected a /help redirect rule');
    assert.equal(help?.destination, '/dashboard');
    // Scoped narrowly: no unrelated routes may be swept in.
    assert.ok(!rules.some((r) => r.source.includes(':path*') || r.source === '/:slug'));
  });
});
