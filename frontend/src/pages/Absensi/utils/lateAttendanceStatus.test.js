import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyRows } from './monthlyAttendance';
import { resolveNoteMeta } from './attendanceNote';
import { buildEmployeeReport } from '../../Laporan/utils/attendanceReportBuilder';
import { toDisplayRecord } from '../../../services/attendanceService';

globalThis.window = { location: { origin: 'https://example.com' } };
const date = '2026-11-18';
const now = new Date('2026-11-18T18:00:00');
const presence = { attendanceId: 1, attendanceDate: date, recordedAt: `${date}T08:30:00`, action: 'MASUK', reason: 'ABSEN', status: 'LATE', approvalStatus: 'NOT_REQUIRED' };
const checkout = { attendanceId: 2, attendanceDate: date, recordedAt: `${date}T17:00:00`, action: 'KELUAR', reason: 'ABSEN', status: 'DONE', approvalStatus: 'NOT_REQUIRED' };
const permission = (approvalStatus) => ({ attendanceId: 3, attendanceDate: date, recordedAt: `${date}T08:00:00`, action: 'IZIN', reason: 'IZIN', approvalStatus, note: 'Kendaraan mogok', reviewNote: 'Catatan pemeriksaan HRD' });
const options = { range: { from: date, to: date }, now, holidaysByDate: {} };

test('HRD decision changes late-arrival label without removing attendance or lateness minutes', () => {
  for (const [status, label] of [[null, 'TERLAMBAT TANPA KETERANGAN'], ['PENDING', 'TERLAMBAT — MENUNGGU ACC'], ['APPROVED', 'TERLAMBAT DENGAN KETERANGAN'], ['REJECTED', 'TERLAMBAT TANPA KETERANGAN']]) {
    const attendances = [presence, checkout, ...(status ? [permission(status)] : [])];
    const record = buildMonthlyRows(attendances.map(toDisplayRecord), 2026, 10, now, [], 'REGULAR', {}).find((row) => row.date === date);
    assert.equal(record.status, label); assert.equal(record.tone, 'telat'); assert.equal(record.lateMinutes, 30);
    assert.ok(resolveNoteMeta(record).badge.label.startsWith(label));
    const report = buildEmployeeReport({ divisionType: 'REGULAR', attendances }, options);
    assert.equal(report.rows[0].status, label);
    assert.equal(report.summary.present, 1); assert.equal(report.summary.absent, 0);
    assert.equal(report.summary.late, 1); assert.equal(report.summary.lateMinutes, 30);
    if (status) assert.ok(resolveNoteMeta(record).detail.includes('Catatan pemeriksaan HRD'));
  }
});
test('permission approval does not make an on-time employee late', () => {
  const report = buildEmployeeReport({ divisionType: 'REGULAR', attendances: [{ ...presence, status: 'ON_TIME', recordedAt: `${date}T07:59:00` }, checkout, permission('APPROVED')] }, options);
  assert.equal(report.rows[0].status, 'HADIR TEPAT WAKTU'); assert.equal(report.summary.late, 0);
});
test('published night-shift lateness uses the shift start on its assigned workdate', () => {
  const report = buildEmployeeReport({ divisionType: 'SHIFTING', schedules: [{ date, shiftId: 3, shiftName: 'Malam', startTime: '23:00', endTime: '07:00' }],
    attendances: [{ ...presence, recordedAt: `${date}T23:20:00` }, { ...checkout, recordedAt: '2026-11-19T07:00:00' }, permission('APPROVED')] }, { ...options, now: new Date('2026-11-19T12:00:00') });
  assert.equal(report.rows[0].status, 'TERLAMBAT DENGAN KETERANGAN'); assert.equal(report.summary.lateMinutes, 20); assert.equal(report.summary.present, 1);
});
