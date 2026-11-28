import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalWorkMinutes, regularDurationSchedule } from './normalWorkDuration.js';
import { resolveRegularDay } from '../../../utils/regularSchedule.js';

const date = '2026-11-10';
const at = (clock, day = date) => new Date(`${day}T${clock}:00`);

test('regular base duration subtracts default lunch, including historical dates', () => {
  const original = resolveRegularDay(null, date);
  const schedule = regularDurationSchedule(original);
  assert.equal(normalWorkMinutes(at('08:20'), at('17:00'), date, schedule), 460);
  assert.equal(normalWorkMinutes(at('08:10'), at('18:00'), date, schedule), 470);
  assert.equal(normalWorkMinutes(at('07:50'), at('18:00'), date, schedule), 480);
  assert.equal(normalWorkMinutes(at('08:00'), at('11:00'), date, schedule), 180);
  assert.equal(normalWorkMinutes(at('12:30'), at('17:00'), date, schedule), 240);
  assert.equal(original.breakStartTime, null);
  assert.equal(original.breakEndTime, null);
});

test('custom regular duration retains its configured break', () => {
  const custom = resolveRegularDay({ startTime: '08:00', endTime: '17:00', dayRules: [
    { dayOfWeek: 2, startTime: '08:00', endTime: '17:30', breakStartTime: '11:30', breakEndTime: '13:00' },
  ] }, date);
  assert.equal(regularDurationSchedule(custom), custom);
  assert.equal(normalWorkMinutes(at('08:20'), at('17:30'), date, custom), 460);
});

test('half-day session duration uses its recorded bounds without regular lunch fallback', () => {
  const session = { scheduledWorkStart: at('13:00'), scheduledWorkEnd: at('17:00'), requiredMinutes: 240 };
  assert.equal(normalWorkMinutes(at('13:20'), at('17:00'), date, session), 220);
});

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
