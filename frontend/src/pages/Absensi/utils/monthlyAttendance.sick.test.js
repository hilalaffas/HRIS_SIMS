import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyRows, getSickRecordCovering } from './monthlyAttendance';
import { buildEmployeeReport } from '../../Laporan/utils/attendanceReportBuilder';
const record = { id: 1, attendanceDate: '2026-11-13', sickStartDate: '2026-11-13', sickEndDate: '2026-11-16', leaveDays: 4, actionCode: 'MASUK', reasonCode: 'SAKIT', approvalStatus: 'APPROVED' };
const now = new Date('2026-11-20T12:00:00');
const rowsFor = (schedules = [], type = 'REGULAR', holidays = {}) => buildMonthlyRows([record], 2026, 10, now, schedules, type, holidays).filter((row) => row.date >= record.sickStartDate && row.date <= record.sickEndDate);
test('regular weekends are excluded without changing certificate dates or duration', () => {
  assert.equal(rowsFor().filter((row) => row.tone === 'sakit').length, 2);
  for (const date of ['2026-11-14', '2026-11-15']) {
    const row = rowsFor().find((item) => item.date === date);
    assert.equal(row.shift, 'Libur'); assert.equal(row.status, '-'); assert.equal(row.tone, '');
    assert.equal(getSickRecordCovering([record], date), undefined);
  }
  assert.equal(record.leaveDays, 4); assert.equal(record.sickEndDate, '2026-11-16');
});
test('national holiday including certificate start date is excluded', () => {
  const rows = rowsFor([], 'REGULAR', { '2026-11-13': 'Libur nasional' });
  assert.equal(rows.filter((row) => row.tone === 'sakit').length, 1);
  assert.equal(rows.find((row) => row.date === '2026-11-13').shift, 'Libur');
});
test('shift work on weekend counts, weekday OFF does not', () => {
  const schedules = ['13', '14', '15', '16'].map((day) => ({ date: `2026-11-${day}`, shiftName: day === '14' ? 'Pagi' : null, startTime: '07:00', endTime: '15:00' }));
  assert.deepEqual(rowsFor(schedules, 'SHIFTING').filter((row) => row.tone === 'sakit').map((row) => row.date), ['2026-11-14']);
  assert.ok(getSickRecordCovering([record], '2026-11-14', { schedules, divisionType: 'SHIFTING' }));
  assert.equal(getSickRecordCovering([record], '2026-11-13', { schedules, divisionType: 'SHIFTING' }), undefined);
});
test('HRD summary counts working days instead of calendar duration', () => {
  const report = buildEmployeeReport({ divisionType: 'REGULAR', attendances: [{ ...record, action: 'MASUK', reason: 'SAKIT' }] }, { range: { from: record.sickStartDate, to: record.sickEndDate }, now, holidaysByDate: {} });
  assert.equal(report.summary.sick, 2);
});
