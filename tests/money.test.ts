import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_CURRENCIES,
  currenciesForCountry,
  currencyByCode,
  isKnownCurrencyCode,
  searchCurrencies,
} from '../lib/currency';
import { eventPriceMinor, formatMoneyMinor } from '../lib/dates';
import { parseMinorAmount } from '../lib/event-form';

describe('integer minor-unit money', () => {
  it('parses decimals with string math only', () => {
    assert.equal(parseMinorAmount('1500'), 150000);
    assert.equal(parseMinorAmount('1500.5'), 150050);
    assert.equal(parseMinorAmount('1500.50'), 150050);
    assert.equal(parseMinorAmount('0.99'), 99);
    assert.equal(parseMinorAmount('0'), 0);
    assert.equal(parseMinorAmount(''), null);
    assert.equal(parseMinorAmount('abc'), null);
    assert.equal(parseMinorAmount('1.234'), null);
    assert.equal(parseMinorAmount('-5'), null);
    assert.equal(parseMinorAmount('1,500'), null);
  });

  it('formats minor units for display without touching storage', () => {
    assert.equal(formatMoneyMinor(150000, 'NGN').replace(/\s+/g, ' ').includes('1,500'), true);
    assert.equal(formatMoneyMinor(null, 'USD'), 'Free');
    assert.equal(eventPriceMinor({ priceAmountMinor: 99, priceAmount: null }), 99);
    // Legacy float rows convert once at read time.
    assert.equal(eventPriceMinor({ priceAmountMinor: null, priceAmount: 10.5 }), 1050);
    assert.equal(eventPriceMinor({ priceAmountMinor: null, priceAmount: null }), null);
  });
});

describe('world-currency dataset', () => {
  it('indexes every currency with its countries', () => {
    assert.ok(ALL_CURRENCIES.length > 100);
    assert.equal(isKnownCurrencyCode('NGN'), true);
    assert.equal(isKnownCurrencyCode('usd'), true);
    assert.equal(isKnownCurrencyCode('ZZZ'), false);
    assert.equal(currencyByCode('RWF')?.name, 'Rwandan franc');
  });

  it('handles shared and multi-currency cases honestly', () => {
    const xof = currencyByCode('XOF');
    assert.ok(xof && xof.countries.length > 5);
    const zw = currenciesForCountry('ZW');
    const codes = zw.map((c) => c.code);
    assert.ok(codes.includes('USD') && codes.includes('ZAR'));
    assert.deepEqual(currenciesForCountry('RW').map((c) => c.code), ['RWF']);
  });

  it('searches across codes, names and countries with ranking', () => {
    assert.equal(searchCurrencies('NGN')[0].code, 'NGN');
    assert.ok(searchCurrencies('nigeria').some((c) => c.code === 'NGN'));
    assert.ok(searchCurrencies('franc').some((c) => c.code === 'RWF'));
    assert.equal(searchCurrencies('zzz-no-such-thing').length, 0);
  });
});
