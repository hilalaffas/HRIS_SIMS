import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalWorkMinutes } from './normalWorkDuration.js';

const date = '2026-11-10';
const at = (clock, day = date) => new Date(`${day}T${clock}:00`);

test('normal work is capped at eight hours even with a late checkout', () => {
  assert.equal(normalWorkMinutes(at('08:00'), at('20:00'), date), 480);
});
test('late arrival counts only until scheduled departure', () => {
  assert.equal(normalWorkMinutes(at('10:00'), at('20:00'), date), 420);
});
test('early arrival does not add normal work time', () => {
  assert.equal(normalWorkMinutes(at('06:00'), at('15:00'), date), 420);
});
test('early departure uses actual checkout', () => {
  assert.equal(normalWorkMinutes(at('09:00'), at('12:00'), date), 180);
});
test('overnight shift uses next day departure boundary', () => {
  const schedule = { startTime: '22:00:00', endTime: '06:00:00' };
  assert.equal(normalWorkMinutes(at('23:00'), at('08:00', '2026-11-11'), date, schedule), 420);
});
test('shorter schedules retain their own end time', () => {
  assert.equal(normalWorkMinutes(at('08:00'), at('18:00'), date, { startTime: '08:00', endTime: '14:00' }), 360);
});
test('missing checkout has no duration and reversed times cannot become negative', () => {
  assert.equal(normalWorkMinutes(at('08:00'), null, date), null);
  assert.equal(normalWorkMinutes(at('10:00'), at('09:00'), date), 0);
});
