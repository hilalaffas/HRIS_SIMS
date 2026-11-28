import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeCustomSchedule, splitCustomSchedule, resolveRegularDay, validateRegularSchedule } from './regularSchedule.js';

const base = { startTime: '13:00', endTime: '20:00', dayRules: [] };
const lunch = { breakStartTime: '16:00', breakEndTime: '17:00' };
const friday = { dayOfWeek: 5, startTime: '13:00', endTime: '21:00', breakStartTime: '17:00', breakEndTime: '18:00' };

test('custom base break persists in weekday rows and survives reopening', () => {
  const stored = composeCustomSchedule(base, lunch, [friday]);
  assert.equal(stored.dayRules.length, 5);
  assert.equal(validateRegularSchedule(stored), '');
  assert.deepEqual(splitCustomSchedule(stored), { baseBreak: lunch, dayRules: [friday] });
  assert.equal(resolveRegularDay(stored, '2026-11-26').requiredMinutes, 360);
  assert.equal(resolveRegularDay(stored, '2026-11-27').endTime, '21:00');
});

test('changing custom hours preserves day overrides and avoids duplicate days', () => {
  const stored = composeCustomSchedule(base, lunch, [friday]);
  const editor = splitCustomSchedule(stored);
  const updated = composeCustomSchedule({ ...stored, startTime: '14:00' }, lunch, editor.dayRules);
  assert.equal(updated.dayRules.find(row => row.dayOfWeek === 1).startTime, '14:00');
  assert.deepEqual(updated.dayRules.find(row => row.dayOfWeek === 5), friday);
  assert.equal(new Set(updated.dayRules.map(row => row.dayOfWeek)).size, 5);
});

test('legacy day-specific schedules are retained and invalid custom breaks are rejected', () => {
  const old = { ...base, dayRules: [friday] };
  assert.deepEqual(splitCustomSchedule(old).dayRules, [friday]);
  assert.notEqual(validateRegularSchedule(composeCustomSchedule(base, { breakStartTime: '12:00', breakEndTime: '13:00' }, [])), '');
});
