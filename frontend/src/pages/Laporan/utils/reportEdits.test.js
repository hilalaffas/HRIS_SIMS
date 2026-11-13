import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachReportEdits, reportTodayWib } from './reportEdits.js';

const now = new Date('2026-11-12T16:59:00Z');
const options = [12, 13].map((day) => ({ date: `2026-11-${day}`, shiftId: 2, shiftName: 'Siang', startTime: '12:00', endTime: '20:00' }));
const employee = { divisionType: 'SHIFTING', schedules: options, shiftOptions: options };
const rows = options.map((s) => ({ date: s.date, status: 'HADIR TEPAT WAKTU', tone: 'hadir', note: 'Bekerja Normal', durationMinutes: 480 }));

test('WIB date controls today and future field permissions', () => {
  const result = attachReportEdits(rows, employee, now);
  assert.equal(result[0].canEditShift, false);
  assert.equal(result[0].canEditStatus, true);
  assert.equal(result[0].canEditNote, true);
  assert.equal(result[1].canEditShift, true);
  assert.equal(result[1].canEditStatus, false);
  assert.equal(result[1].canEditNote, false);
});
test('at midnight WIB the shift locks and notes/status unlock', () => {
  const midnight = new Date('2026-11-12T17:00:00Z');
  assert.equal(reportTodayWib(midnight), '2026-11-13');
  const row = attachReportEdits(rows, employee, midnight)[1];
  assert.equal(row.canEditShift, false); assert.equal(row.canEditNote, true);
});
test('regular future shifts and schedules not published cannot be edited', () => {
  assert.equal(attachReportEdits(rows, { ...employee, divisionType: 'REGULAR' }, now)[1].canEdit, false);
  assert.equal(attachReportEdits(rows, { ...employee, schedules: [] }, now)[1].canEdit, false);
});
test('latest correction updates status/note but preserves attendance evidence and duration', () => {
  const source = [{ ...rows[0], checkInEvidence: { photoUrl: 'proof.jpg' } }];
  const result = attachReportEdits(source, { ...employee, revisions: [
    { id: 1, date: rows[0].date, afterStatus: 'TERLAMBAT', afterNote: 'Lama' },
    { id: 2, date: rows[0].date, afterStatus: 'TANPA KETERANGAN', afterNote: 'Terbaru' },
  ] }, now)[0];
  assert.equal(result.status, 'TANPA KETERANGAN'); assert.equal(result.note, 'Terbaru');
  assert.equal(result.history[0].id, 2); assert.equal(result.durationMinutes, 480);
  assert.equal(result.checkInEvidence.photoUrl, 'proof.jpg'); assert.equal(source[0].status, 'HADIR TEPAT WAKTU');
});
test('schedule-only audit never replaces actual schedule or future note/status', () => {
  const result = attachReportEdits(rows, { ...employee, revisions: [{ id: 9, date: rows[1].date, scheduleChange: true, afterNote: null, afterStatus: null }] }, now)[1];
  assert.equal(result.shiftId, 2); assert.equal(result.note, 'Bekerja Normal'); assert.equal(result.history.length, 1);
});
test('approved leave and pending multi-day sick lock manual status corrections', () => {
  const data = { ...employee, leaves: [{ startDate: rows[0].date, endDate: rows[0].date }],
    revisions: [{ id: 1, date: rows[0].date, afterStatus: 'TERLAMBAT', afterNote: 'Catatan' }] };
  assert.equal(attachReportEdits(rows, data, now)[0].canEditStatus, false);
  const sick = { ...employee, attendances: [{ attendanceDate: '2026-11-11', reason: 'SAKIT', approvalStatus: 'PENDING', leaveDays: 2 }] };
  assert.equal(attachReportEdits(rows, sick, now)[0].canEditStatus, false);
});

test('division catalog options remain available when everyone is assigned the same shift', () => {
  const catalog = [1, 2, 3].map((id) => ({ date: null, shiftId: id, shiftName: `Shift ${id}`, startTime: '08:00', endTime: '16:00' }));
  const result = attachReportEdits(rows, { ...employee, shiftOptions: catalog }, now);
  assert.deepEqual(result[1].shiftOptions.map((s) => s.shiftId), [1, 2, 3]);
  assert.equal(result[1].canEditShift, true);
});
