import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateOvertimeDate, overtimeRangeMinutes, creditedOvertimeMinutes, withHolidayWindow } from './holidayOvertime.js';
import { resolveActiveWorkShift } from '../pages/Absensi/utils/activeWorkShift.js';
import { buildEmployeeReport } from '../pages/Laporan/utils/attendanceReportBuilder.js';
const calendar = { regularEmployee: true, serverDate: '2026-11-20', holidayDates: ['2026-11-23'], allowedHolidayDates: ['2026-11-21', '2026-11-22', '2026-11-23'], approvedOvertimes: [] };
const schedule = { divisionType: 'REGULAR', schedules: [], holidayWindow: calendar };
const approved = { date: '2026-11-21', startsAt: '2026-11-21T09:00:00', endsAt: '2026-11-21T13:00:00' };
const now = (clock, date = '2026-11-21') => new Date(`${date}T${clock}:00+07:00`);

test('Friday can submit Saturday, Sunday and holiday Monday, other future dates cannot', () => {
  for (const date of calendar.allowedHolidayDates) assert.equal(validateOvertimeDate(date, calendar), '');
  assert.notEqual(validateOvertimeDate('2026-11-24', calendar), '');
  assert.notEqual(validateOvertimeDate('2026-11-21', { ...calendar, serverDate: '2026-11-21', allowedHolidayDates: [] }), '');
  assert.notEqual(validateOvertimeDate('2026-11-21', { ...calendar, regularEmployee: false }), '');
  assert.notEqual(validateOvertimeDate('2026-11-21', null), '');
  assert.equal(overtimeRangeMinutes('09:00', '17:00'), 480);
  assert.equal(overtimeRangeMinutes('09:00', '09:00'), 0);
  assert.equal(overtimeRangeMinutes('23:00', '07:00'), -960);
});
test('holiday attendance is blocked without approval and outside approved hours', () => {
  assert.equal(resolveActiveWorkShift(schedule, [], now('10:00')).canCheckIn, false);
  const data = { ...schedule, holidayWindow: { ...calendar, approvedOvertimes: [approved] } };
  assert.equal(resolveActiveWorkShift(data, [], now('08:59')).canCheckIn, false);
  const active = resolveActiveWorkShift(data, [], now('09:00'));
  assert.equal(active.canCheckIn, true); assert.equal(active.requiredWorkHours, 0);
  assert.equal(active.hoursLabel, '09:00 - 13:00');
  assert.equal(resolveActiveWorkShift(data, [], now('13:00')).canCheckIn, false);
});
test('legacy overnight holiday check-in and checkout preserve Sunday work date on Monday', () => {
  const overnight = { date: '2026-11-22', startsAt: '2026-11-22T23:00:00', endsAt: '2026-11-23T07:00:00' };
  const data = { ...schedule, holidayWindow: { ...calendar, approvedOvertimes: [overnight] } };
  assert.equal(resolveActiveWorkShift(data, [], now('01:00', '2026-11-23')).workDate, overnight.date);
  const checkIn = { attendanceDate: overnight.date, actionCode: 'MASUK', reasonCode: 'ABSEN', holidayOvertime: true,
    holidayOvertimeStart: new Date(overnight.startsAt), holidayOvertimeEnd: new Date(overnight.endsAt) };
  const active = resolveActiveWorkShift(data, [checkIn], now('09:00', '2026-11-23'));
  assert.equal(active.workDate, overnight.date); assert.equal(active.checkIn, checkIn);
  assert.equal(active.holidayOvertime, true);
});
test('published shift workers still work their own shift on weekends', () => {
  const data = { ...schedule, divisionType: 'SHIFTING', schedules: [{date:'2026-11-21', shiftId:1, shiftName:'Pagi', startTime:'07:00', endTime:'15:00'}] };
  const active = resolveActiveWorkShift(data, [], now('09:00'));
  assert.equal(active.canCheckIn, true); assert.equal(active.hoursLabel, '07:00 - 15:00');
  assert.equal(active.holidayOvertime, undefined);
});
function report(date, start, end, arrival, departure, totalMinutes) {
  return buildEmployeeReport({ divisionType:'REGULAR', attendances: [
    {attendanceId:1, attendanceDate:date, recordedAt:arrival, action:'MASUK', reason:'ABSEN', status:'HOLIDAY_OVERTIME', holidayOvertime:true},
    {attendanceId:2, attendanceDate:date, recordedAt:departure, action:'KELUAR', reason:'ABSEN', holidayOvertime:true},
  ], overtimes:[{overtimeId:1, overtimeDate:date, startTime:start, endTime:end, status:'APPROVED', totalMinutes, holidayAttendanceRequired:true}] },
  {range:{from:date,to:date}, now:new Date('2026-11-25T12:00:00'), holidaysByDate:{}});
}
test('employee and HRD reports keep normal hours zero, actual overtime capped to approved end', () => {
  const result = report('2026-11-21', '09:00', '13:00', '2026-11-21T09:15:00', '2026-11-21T13:30:00', 240);
  const row = result.rows[0];
  assert.equal(row.status, 'LEMBUR HARI LIBUR'); assert.equal(row.shift, 'Libur');
  assert.equal(row.durationMinutes, 0); assert.equal(result.summary.overtimeMinutes, 225);
  assert.equal(row.overtimeAccMinutes, 450);
});
test('legacy overnight report credits overlap across dates without adding normal hours', () => {
  const result = report('2026-11-22', '23:00', '07:00', '2026-11-22T23:30:00', '2026-11-23T07:30:00', 480);
  assert.equal(result.rows[0].durationMinutes, 0); assert.equal(result.summary.overtimeMinutes, 450);
});
test('new approved holiday overtime needs both attendance records; existing requests retain legacy credit', () => {
  const item = { date:'2026-11-21', startTime:'09:00', endTime:'13:00', totalMinutes:240, holidayAttendanceRequired:true };
  assert.equal(creditedOvertimeMinutes(item), 0);
  assert.equal(creditedOvertimeMinutes(item, { attendanceCheckInAt:new Date('2026-11-21T09:00:00') }), 0);
  assert.equal(creditedOvertimeMinutes({ ...item, holidayAttendanceRequired:false }), 240);
});

test('withHolidayWindow attaches the window, and gives regular employees a minimal context when schedule is missing', () => {
  assert.deepEqual(withHolidayWindow({ divisionType: 'SHIFTING', schedules: [] }, calendar).holidayWindow, calendar);
  assert.deepEqual(withHolidayWindow(null, calendar), { divisionType: 'REGULAR', schedules: [], holidayWindow: calendar });
  assert.equal(withHolidayWindow(null, { ...calendar, regularEmployee: false }), null);
  assert.equal(withHolidayWindow(null, null), null);
});
