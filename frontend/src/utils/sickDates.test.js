import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarDayCount, calendarEndDate, sickTodayWib, updateSickRange } from './sickDates.js';
test('three calendar days starting Friday include Saturday and Sunday', () => {
  assert.equal(calendarEndDate('2026-11-13', 3), '2026-11-15');
  assert.equal(calendarDayCount('2026-11-13', '2026-11-15'), 3);
});
test('month/year boundaries and leap days remain inclusive', () => {
  assert.equal(calendarEndDate('2026-12-31', 3), '2027-01-02');
  assert.equal(calendarDayCount('2028-02-28', '2028-03-01'), 3);
  assert.ok(Number.isNaN(calendarDayCount('2026-02-30','2026-03-01')));
});
test('duration and calendar selections update each other', () => {
  let range = { startDate:'2026-11-13',endDate:'2026-11-13',days:'1' };
  range = updateSickRange(range,'days','3'); assert.equal(range.endDate,'2026-11-15');
  range = updateSickRange(range,'endDate','2026-11-17'); assert.equal(range.days,'5');
  range = updateSickRange(range,'startDate','2026-11-15'); assert.equal(range.days,'3');
  range = updateSickRange(range,'days','2'); assert.equal(range.endDate,'2026-11-16');
});
test('half-day early sick stays on one date and WIB determines today', () => {
  assert.equal(calendarEndDate('2026-11-13',0.5),'2026-11-13');
  assert.equal(sickTodayWib(new Date('2026-11-13T17:01:00Z')),'2026-11-14');
});
