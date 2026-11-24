import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBeforeWorkEnd } from './workEndCheckout.js';

// jakartaWallClock() membaca jam WIB, jadi "now" dibuat dari instant UTC (WIB = UTC+7).
const wib = (clock) => new Date(`2026-11-24T${clock}:00+07:00`);
const end = new Date('2026-11-24T17:00:00'); // jam dinding WIB, sama seperti shiftContext.endsAt

test('one minute before work end is early checkout', () => {
  assert.equal(isBeforeWorkEnd(end, wib('16:59')), true);
});
test('checkout exactly at or after work end is normal', () => {
  assert.equal(isBeforeWorkEnd(end, wib('17:00')), false);
  assert.equal(isBeforeWorkEnd(end, wib('18:30')), false);
});
test('arriving before shift start does not make an afternoon checkout normal', () => {
  assert.equal(isBeforeWorkEnd(end, wib('16:06')), true);
});
test('unknown work end never blocks', () => {
  assert.equal(isBeforeWorkEnd(null, wib('10:00')), false);
  assert.equal(isBeforeWorkEnd(new Date('x'), wib('10:00')), false);
});
