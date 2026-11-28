import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyRows } from './monthlyAttendance.js';
import { buildTypedDailyRows } from '../../Laporan/utils/attendanceReportSheets.js';

const date = '2026-11-26';
const at = (clock, day = date) => new Date(`${day}T${clock}:00`);
const checkIn = { attendanceDate: date, actionCode: 'MASUK', reasonCode: 'ABSEN', recordedAt: at('08:20'), isLate: true };
const row = (records = [checkIn], now = at('10:00', '2026-11-27'), type = 'REGULAR', schedules = [], regular = null) =>
  buildMonthlyRows(records, 2026, 11, now, schedules, type, {}, regular).find(item => item.date === date);

test('past regular missing checkout shows scheduled end and net duration without fabricated evidence', () => {
  const result = row();
  assert.equal(result.checkOut, '17:00:00 (otomatis sistem)');
  assert.equal(result.durationMinutes, 460);
  assert.equal(result.automaticCheckout, true);
  assert.equal(result.attendanceCheckOutAt, null);
  assert.match(result.noteDetail, /Tidak Absen Pulang/);
  assert.equal(checkIn.recordedAt.getHours(), 8);
  const exported = buildTypedDailyRows({ rows: [result], divisionType: 'REGULAR', schedules: [] });
  assert.equal(exported[0][6], result.checkOut);
});

test('today remains in progress and a real checkout wins over the estimate', () => {
  assert.equal(row([checkIn], at('19:00')).automaticCheckout, false);
  assert.equal(row([checkIn], at('19:00')).durationMinutes, null);
  const result = row([checkIn, { ...checkIn, actionCode: 'KELUAR', recordedAt: at('16:30') }]);
  assert.equal(result.automaticCheckout, false);
  assert.equal(result.checkOut, '16:30:00');
  assert.equal(result.durationMinutes, 430);
});

test('custom days and half-day sessions use their own ends', () => {
  const custom = { startTime: '08:00', endTime: '17:00', dayRules: [{ dayOfWeek: 4, startTime: '08:00', breakStartTime: '12:00', breakEndTime: '13:30', endTime: '17:30' }] };
  assert.equal(row([checkIn], undefined, 'REGULAR', [], custom).checkOut, '17:30:00 (otomatis sistem)');
  const half = { ...checkIn, recordedAt: at('13:20'), scheduledWorkStart: at('13:00'), scheduledWorkEnd: at('17:00'), scheduledWorkMinutes: 240 };
  assert.equal(row([half]).durationMinutes, 220);
});

test('expired shifts receive assumed checkout while holiday overtime and empty days do not', () => {
  const shift = { date, startTime: '08:00', endTime: '16:00', shiftId: 1 };
  assert.equal(row([checkIn], undefined, 'SHIFTING', [shift]).durationMinutes, 460);
  assert.equal(row([{ ...checkIn, holidayOvertime: true }]).durationMinutes, null);
  assert.equal(row([]).checkOut, null);
});


test('overnight duration appears at the midpoint deadline, never at midnight', () => {
  const night = { date, shiftId: 3, shiftName: 'Malam', startTime: '23:00', endTime: '07:00' };
  const next = { date: '2026-11-27', shiftId: 1, shiftName: 'Siang', startTime: '13:00', endTime: '21:00' };
  const records = [{ ...checkIn, recordedAt: at('23:20') }];
  assert.equal(row(records, at('09:59', '2026-11-27'), 'SHIFTING', [night, next]).durationMinutes, null);
  const result = row(records, at('10:00', '2026-11-27'), 'SHIFTING', [night, next]);
  assert.equal(result.checkOut, '07:00:00 (otomatis sistem)');
  assert.equal(result.durationMinutes, 460);
  assert.equal(result.attendanceCheckOutAt, null);
});
