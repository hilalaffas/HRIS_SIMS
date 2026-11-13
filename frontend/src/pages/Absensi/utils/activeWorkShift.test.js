import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveActiveWorkShift, shiftBounds } from './activeWorkShift.js';
const night = { date: '2026-11-13', shiftId: 3, shiftName: 'Shift Malam', startTime: '23:00', endTime: '07:00' };
const data = { divisionType: 'SHIFTING', schedules: [night, {date:'2026-11-14',shiftId:null,shiftName:null}] };
const checkIn = { attendanceDate: night.date, actionCode: 'MASUK', reasonCode: 'ABSEN', recordedAt: new Date('2026-11-13T23:10:00') };
test('regular always follows 08–17 even if a shift assignment exists', () => {
  const result = resolveActiveWorkShift({ ...data, divisionType: 'REGULAR' }, [], new Date('2026-11-13T13:00:00+07:00'));
  assert.equal(result.hoursLabel, '08:00 - 17:00'); assert.equal(result.requiredWorkHours, 8);
});
test('published night shift never becomes regular and cannot start before 23', () => {
  const result = resolveActiveWorkShift(data, [], new Date('2026-11-13T13:00:00+07:00'));
  assert.equal(result.hoursLabel, '23:00 - 07:00'); assert.equal(result.canCheckIn, false); assert.equal(result.overnight, true);
  assert.equal(result.endsAt.getDate(),14);
});
test('midnight and late checkout after shift end preserve the original work date', () => {
  for (const clock of ['01:00', '07:00', '08:30']) {
    const result = resolveActiveWorkShift(data, [checkIn], new Date(`2026-11-14T${clock}:00+07:00`));
    assert.equal(result.workDate, night.date); assert.equal(result.checkIn, checkIn); assert.equal(result.hoursLabel, '23:00 - 07:00');
  }
});
test('checkout completes previous shift and then next day OFF is shown', () => {
  const result = resolveActiveWorkShift(data, [checkIn, {actionCode:'KELUAR',attendanceDate:night.date}], new Date('2026-11-14T08:00:00+07:00'));
  assert.equal(result.workDate, '2026-11-14'); assert.equal(result.hoursLabel, 'Libur / OFF'); assert.equal(result.canCheckIn,false);
});
test('missing or failed schedule fetch never falls back to regular hours', () => {
  const now = new Date('2026-11-13T13:00:00+07:00');
  assert.equal(resolveActiveWorkShift({divisionType:'SHIFTING',schedules:[]},[],now).hoursLabel, 'Jadwal belum dipublikasikan');
  assert.equal(resolveActiveWorkShift(null,[],now).hoursLabel,'Jadwal tidak tersedia');
});
test('late checkin after midnight can use yesterday night shift even if today has another shift', () => {
  const result = resolveActiveWorkShift({divisionType:'SHIFTING',schedules:[night,{date:'2026-11-14',shiftId:2,shiftName:'Siang',startTime:'15:00',endTime:'23:00'}]},[],new Date('2026-11-14T01:00:00+07:00'));
  assert.equal(result.workDate,night.date); assert.equal(result.canCheckIn,true);
});
test('scheduled boundaries carry dates and shorter shift durations', () => {
  assert.equal(shiftBounds('2026-11-13','23:00','07:00').endsAt.getDate(),14);
  const result = resolveActiveWorkShift({divisionType:'SHIFTING',schedules:[{date:'2026-11-13',shiftId:4,shiftName:'Pendek',startTime:'10:00',endTime:'16:00'}]},[],new Date('2026-11-13T12:00:00+07:00'));
  assert.equal(result.requiredWorkHours,6); assert.equal(result.canCheckIn,true);
});
