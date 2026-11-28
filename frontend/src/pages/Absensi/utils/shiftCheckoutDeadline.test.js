import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shiftCheckoutDeadline } from './activeWorkShift.js';
const end = new Date('2026-11-26T23:00:00');
const next = time => [{ date: '2026-11-27', startTime: time, endTime: '17:00' }];
test('eight hours after work end for long gaps, exact eight hours, OFF and missing schedule', () => {
  for (const schedules of [next('09:00'), next('07:00'), [], [{ date: '2026-11-27' }]]) {
    assert.equal(+shiftCheckoutDeadline(end, schedules, '2026-11-26'), +new Date('2026-11-27T07:00:00'));
  }
});
test('short gap uses its midpoint across midnight', () => {
  assert.equal(+shiftCheckoutDeadline(end, next('05:00'), '2026-11-26'), +new Date('2026-11-27T02:00:00'));
});
