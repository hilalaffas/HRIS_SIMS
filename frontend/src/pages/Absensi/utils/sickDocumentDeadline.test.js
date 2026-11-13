import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sickDocumentDeadline, isSickDocumentExpired } from '../../../utils/sickDocumentDeadline';
import { medicalDocumentStatus } from '../../../utils/medicalDocumentStatus';
import { buildMonthlyRows } from './monthlyAttendance';
import { buildEmployeeReport } from '../../Laporan/utils/attendanceReportBuilder';
const record = { id: 1, attendanceDate: '2026-11-13', recordedAt: '2026-11-13T09:00:00', sickStartDate: '2026-11-13', sickEndDate: '2026-11-16', leaveDays: 4, actionCode: 'MASUK', reasonCode: 'SAKIT', approvalStatus: 'APPROVED', documentRequired: true };
const before = new Date('2026-11-20T16:59:59Z');
const after = new Date('2026-11-20T17:00:00Z');
test('21–20 period and WIB deadline are inclusive until 23:59:59 on day 20', () => {
  assert.equal(sickDocumentDeadline(record), '2026-11-20');
  assert.equal(isSickDocumentExpired(record, before), false);
  assert.equal(isSickDocumentExpired(record, after), true);
  assert.equal(sickDocumentDeadline({ ...record, recordedAt: '2026-11-21T00:00:00' }), '2026-12-20');
  assert.equal(sickDocumentDeadline({ ...record, recordedAt: '2026-12-31T00:00:00' }), '2027-01-20');
});
test('approved sick becomes alpha on workdays, weekends stay holiday', () => {
  const rows = buildMonthlyRows([record], 2026, 10, after, [], 'REGULAR', {});
  for (const day of ['2026-11-13', '2026-11-16']) {
    const row = rows.find((item) => item.date === day);
    assert.equal(row.tone, 'alpha'); assert.equal(row.document.expired, true);
  }
  assert.equal(rows.find((row) => row.date === '2026-11-14').shift, 'Libur');
  assert.equal(rows.find((row) => row.date === '2026-11-14').tone, '');
  const prior = buildMonthlyRows([record], 2026, 10, before, [], 'REGULAR', {});
  assert.equal(prior.filter((row) => row.tone === 'sakit').length, 2);
  assert.equal(medicalDocumentStatus(record, after).canUpload, false);
});
test('timely uploaded pending letter is exempt; rejected letter cannot be uploaded after deadline', () => {
  const uploaded = { ...record, documentUrl: 'https://example.com/letter.pdf', documentReviewStatus: 'PENDING' };
  assert.equal(isSickDocumentExpired(uploaded, after), false);
  assert.equal(buildMonthlyRows([uploaded], 2026, 10, after, [], 'REGULAR', {}).filter((row) => row.tone === 'sakit').length, 2);
  assert.equal(medicalDocumentStatus({ ...uploaded, documentReviewStatus: 'REJECTED' }, after).canUpload, false);
});
test('report summary excludes expired sick and counts alpha for working days', () => {
  const employee = { divisionType: 'REGULAR', attendances: [{ ...record, attendanceId: 1, action: 'MASUK', reason: 'SAKIT' }] };
  const report = buildEmployeeReport(employee, { range: { from: '2026-11-13', to: '2026-11-16' }, now: after, holidaysByDate: {} });
  assert.equal(report.summary.sick, 0); assert.equal(report.summary.absent, 2);
});

test('early checkout sick notice also expires while actual attendance evidence is kept', () => {
  const notice = { ...record, actionCode: 'SAKIT', sickEndDate: '2026-11-13', leaveDays: 0.5 };
  const checkIn = { id: 2, attendanceDate: record.attendanceDate, actionCode: 'MASUK', reasonCode: 'ABSEN', approvalStatus: 'NOT_REQUIRED', recordedAt: new Date('2026-11-13T08:00:00'), time: '08:00' };
  const row = buildMonthlyRows([checkIn, notice], 2026, 10, after, [], 'REGULAR', {}).find((item) => item.date === record.attendanceDate);
  assert.equal(row.tone, 'alpha'); assert.equal(row.checkIn, '08:00:00');
});
