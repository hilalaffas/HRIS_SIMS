import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOvertimeAcc,
  calculateOvertimeAccMinutes,
  sumApprovedMinutesByDate,
} from './overtimeAcc.js';

const approved = (date, totalMinutes) => ({ date, totalMinutes, statusCode: 'APPROVED' });

test('weekday: first hour x1.5, remaining x2', () => {
  assert.equal(calculateOvertimeAccMinutes(30, false), 45);
  assert.equal(calculateOvertimeAccMinutes(60, false), 90);
  assert.equal(calculateOvertimeAccMinutes(120, false), 210);
  assert.equal(calculateOvertimeAccMinutes(90, false), 150);
});

test('holiday / rest day: every approved minute x2', () => {
  assert.equal(calculateOvertimeAccMinutes(60, true), 120);
  assert.equal(calculateOvertimeAccMinutes(150, true), 300);
});

test('zero or invalid minutes give zero', () => {
  assert.equal(calculateOvertimeAccMinutes(0, false), 0);
  assert.equal(calculateOvertimeAccMinutes(undefined, true), 0);
});

test('only APPROVED overtime is summed, several requests on one date are added', () => {
  const map = sumApprovedMinutesByDate([
    approved('2026-11-03', 60),
    approved('2026-11-03', 30),
    { date: '2026-11-03', totalMinutes: 500, statusCode: 'PENDING' },
    { date: '2026-11-04', totalMinutes: 500, statusCode: 'REJECTED' },
  ]);
  assert.equal(map.get('2026-11-03'), 90);
  assert.equal(map.has('2026-11-04'), false);
});

test('no approved overtime returns the very same rows array (no extra allocation)', () => {
  const rows = [{ date: '2026-11-03', shift: 'Shift Normal (08:00 - 17:00)' }];
  assert.equal(applyOvertimeAcc(rows, [], {}), rows);
  assert.equal(applyOvertimeAcc(rows, [{ date: '2026-11-03', totalMinutes: 60, statusCode: 'PENDING' }], {}), rows);
});

test('only rows with approved overtime get overtimeAccMinutes; rest day detection', () => {
  const rows = [
    { date: '2026-11-03', shift: 'Shift Normal (08:00 - 17:00)' }, // hari kerja
    { date: '2026-11-04', shift: 'Libur' },
    { date: '2026-11-05', shift: 'Shift Normal (08:00 - 17:00)' }, // libur nasional
    { date: '2026-11-06', shift: 'Shift Normal (08:00 - 17:00)' }, // tanpa lembur
  ];
  const result = applyOvertimeAcc(
    rows,
    [approved('2026-11-03', 60), approved('2026-11-04', 60), approved('2026-11-05', 60)],
    { holidaysByDate: { '2026-11-05': 'Libur Nasional' }, divisionType: 'REGULAR' },
  );
  assert.equal(result[0].overtimeAccMinutes, 90);
  assert.equal(result[1].overtimeAccMinutes, 120);
  assert.equal(result[2].overtimeAccMinutes, 120);
  assert.equal(result[3], rows[3]);
  assert.equal('overtimeAccMinutes' in rows[0], false, 'input rows are not mutated');
});

test('shifting division: unpublished schedule counts as rest day, regular does not', () => {
  const rows = [{ date: '2026-11-03', shift: 'Belum dipublikasikan' }];
  const overtimes = [approved('2026-11-03', 60)];
  assert.equal(applyOvertimeAcc(rows, overtimes, { divisionType: 'shifting' })[0].overtimeAccMinutes, 120);
  assert.equal(applyOvertimeAcc(rows, overtimes, { divisionType: 'REGULAR' })[0].overtimeAccMinutes, 90);
});
