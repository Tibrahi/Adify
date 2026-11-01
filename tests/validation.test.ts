import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { countryByCode, AFRICAN_COUNTRIES, isKnownCountryCode } from '../lib/countries';
import { formatEventDateTime, formatMoney } from '../lib/dates';
import { hasActiveFilters, parseFilters } from '../lib/discovery';
import { validatePhone } from '../lib/phone';
import { safeNextPath } from '../lib/util';
import { isCountryCode, isEmail, isValidTimezone, passwordIssues } from '../lib/validate';

describe('input validation', () => {
  it('validates emails', () => {
    assert.equal(isEmail('ada@example.com'), true);
    assert.equal(isEmail('not-an-email'), false);
    assert.equal(isEmail('a@b'), false);
    assert.equal(isEmail(''), false);
  });

  it('requires strong-enough passwords', () => {
    assert.deepEqual(passwordIssues('Passw0rd!'), []);
    assert.ok(passwordIssues('short1').length > 0);
    assert.ok(passwordIssues('no-number-here').length > 0);
    assert.ok(passwordIssues('12345678').length > 0);
  });

  it('validates IANA timezones and country codes', () => {
    assert.equal(isValidTimezone('Africa/Lagos'), true);
    assert.equal(isValidTimezone('Mars/Olympus'), false);
    assert.equal(isCountryCode('NG'), true);
    assert.equal(isCountryCode('NIG'), false);
  });

  it('blocks open redirects', () => {
    assert.equal(safeNextPath('/dashboard/events/new'), '/dashboard/events/new');
    assert.equal(safeNextPath('https://evil.example.com'), null);
    assert.equal(safeNextPath('//evil.example.com'), null);
    assert.equal(safeNextPath('/\\evil'), null);
    assert.equal(safeNextPath('/ok?x=https://y'), null);
    assert.equal(safeNextPath(12345), null);
  });

  it('parses discovery filters defensively', () => {
    const f = parseFilters({
      q: '  lagos tech ',
      class: 'event',
      pricing: 'free',
      attendance: 'nope',
      time: 'upcoming',
      country: 'ng',
      available: '1',
      page: '2',
    });
    assert.equal(f.q, 'lagos tech');
    assert.equal(f.class, 'event');
    assert.equal(f.pricing, 'free');
    assert.equal(f.attendance, undefined);
    assert.equal(f.time, 'upcoming');
    assert.equal(f.country, 'NG');
    assert.equal(f.availableOnly, true);
    assert.equal(hasActiveFilters({ page: '2' }), false);
    assert.equal(hasActiveFilters({ q: 'x' }), true);
  });
});

describe('countries, phones, dates', () => {
  it('resolves African countries with flags and calling codes', () => {
    assert.ok(AFRICAN_COUNTRIES.length > 40);
    const ng = countryByCode('NG');
    assert.equal(ng?.name, 'Nigeria');
    assert.ok((ng?.flag ?? '').length > 0);
    assert.ok((ng?.callingCode ?? '').startsWith('+'));
    assert.equal(isKnownCountryCode('GH'), true);
    assert.equal(isKnownCountryCode('XX'), false);
  });

  it('validates international phone numbers', () => {
    const good = validatePhone('+2348031234567', 'NG');
    assert.equal(good.ok, true);
    assert.ok(good.e164.startsWith('+234'));
    assert.equal(validatePhone('123', 'NG').ok, false);
  });

  it('formats event times in the event timezone and money by currency', () => {
    const lagos = formatEventDateTime('2026-11-01T10:00:00.000Z', 'Africa/Lagos');
    assert.ok(lagos.includes('2026') || lagos.includes('Nov'));
    const money = formatMoney(1500, 'NGN');
    assert.ok(money.includes('1,500'));
    assert.equal(formatMoney(10, 'NOPE'), 'NOPE 10');
  });
});
