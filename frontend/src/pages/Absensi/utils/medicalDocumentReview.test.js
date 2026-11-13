import { test } from 'node:test';
import assert from 'node:assert/strict';
import { medicalDocumentStatus } from '../../../utils/medicalDocumentStatus';
import { buildSickCardModel } from '../../../utils/approvalCardModels';
import { toDisplayRecord } from '../../../services/attendanceService';
import { buildMonthlyRows } from './monthlyAttendance';
import { resolveNoteMeta } from './attendanceNote';
import { buildRequestDetail, buildPengajuanItems } from '../../Pengajuan/utils/pengajuanItems';
import { toPermissionRow } from '../../PersetujuanIzin/utils/permissionRequest';

globalThis.window = { location: { origin: 'https://example.com' } };
const base = { attendanceId: 1, attendanceDate: '2026-11-13', sickStartDate: '2026-11-13', sickEndDate: '2026-11-13', leaveDays: 1, recordedAt: '2026-11-13T09:00:00', action: 'MASUK', reason: 'SAKIT', approvalStatus: 'APPROVED', documentRequired: true, documentUrl: 'https://example.com/doctor.pdf' };
const rowFor = (raw) => buildMonthlyRows([toDisplayRecord(raw)], 2026, 10, new Date('2026-11-13T12:00:00'), [], 'REGULAR', {}).find((row) => row.date === base.attendanceDate);

test('pending follow-up is separate from approved leave on employee and HRD screens', () => {
  const raw = { ...base, documentReviewStatus: 'PENDING' };
  const record = toDisplayRecord(raw);
  assert.equal(buildSickCardModel(record).badgeLabel, 'Disetujui');
  const item = buildPengajuanItems({ attendanceRecords: [record] })[0];
  assert.equal(item.statusCode, 'APPROVED'); assert.equal(item.documentStatus.code, 'PENDING');
  assert.equal(item.needsLetter, false);
  assert.equal(toPermissionRow(raw).documentReviewPending, true);
  const meta = resolveNoteMeta(rowFor(raw));
  assert.equal(meta.badge.label, 'SAKIT');
  assert.ok(meta.notices.some((notice) => notice.label.includes('Verifikasi HRD')));
});
test('rejected letter preserves sick attendance and offers reupload with HRD reason', () => {
  const raw = { ...base, documentReviewStatus: 'REJECTED', documentReviewNote: 'Cap dokter tidak jelas' };
  const record = toDisplayRecord(raw);
  const item = buildPengajuanItems({ attendanceRecords: [record] })[0];
  assert.equal(item.statusLabel, 'Disetujui'); assert.equal(item.needsLetter, true);
  assert.equal(item.documentStatus.note, raw.documentReviewNote);
  const meta = resolveNoteMeta(rowFor(raw));
  assert.equal(meta.badge.label, 'SAKIT');
  assert.ok(meta.notices.some((notice) => notice.label.includes(raw.documentReviewNote)));
  assert.ok(meta.actions.some((action) => action.label === 'Upload Ulang Surat Sakit' && action.payload === 1));
  assert.equal(toPermissionRow(raw).documentReviewPending, false);
});
test('valid letter removes upload action and shows valid status', () => {
  const raw = { ...base, documentReviewStatus: 'VALID' };
  assert.equal(medicalDocumentStatus(raw).canUpload, false);
  const meta = resolveNoteMeta(rowFor(raw));
  assert.equal(meta.actions.length, 0);
  assert.ok(meta.notices.some((notice) => notice.label === 'Surat Dokter Valid'));
  assert.equal(toPermissionRow(raw).documentReviewPending, false);
});
test('missing letter and rejected leave allow upload before the deadline', () => {
  assert.equal(medicalDocumentStatus({ ...base, documentUrl: null }).canUpload, true);
  assert.equal(medicalDocumentStatus({ ...base, documentUrl: null, approvalStatus: 'REJECTED' }, new Date('2026-11-13T12:00:00Z')).canUpload, true);
});


test('proposed dates are visible while the effective attendance period stays unchanged', () => {
  const raw = { ...base, documentReviewStatus: 'PENDING', documentStartDate: '2026-11-13', documentEndDate: '2026-11-16' };
  const record = toDisplayRecord(raw);
  assert.equal(record.documentEndDate, '2026-11-16');
  const item = buildPengajuanItems({ attendanceRecords: [record] })[0];
  assert.ok(item.documentStatus.periodLabel.includes('4 hari kalender'));
  assert.ok(toPermissionRow(raw).document.periodLabel.includes('16/11/2026'));
  const rows = buildMonthlyRows([record], 2026, 10, new Date('2026-11-20T12:00:00'), [], 'REGULAR', {});
  assert.deepEqual(rows.filter((row) => row.tone === 'sakit').map((row) => row.date), ['2026-11-13']);
});
test('accepted extension counts only working days within the new certificate dates', () => {
  const raw = { ...base, documentReviewStatus: 'VALID', sickEndDate: '2026-11-16', leaveDays: 4, documentStartDate: '2026-11-13', documentEndDate: '2026-11-16' };
  const rows = buildMonthlyRows([toDisplayRecord(raw)], 2026, 10, new Date('2026-11-20T12:00:00'), [], 'REGULAR', {});
  assert.deepEqual(rows.filter((row) => row.tone === 'sakit').map((row) => row.date), ['2026-11-16', '2026-11-13']);
});
test('changing start date never leaves sick attendance on the old date', () => {
  const raw = { ...base, documentReviewStatus: 'VALID', sickStartDate: '2026-11-16', sickEndDate: '2026-11-17', leaveDays: 2 };
  const rows = buildMonthlyRows([toDisplayRecord(raw)], 2026, 10, new Date('2026-11-20T12:00:00'), [], 'REGULAR', {});
  assert.deepEqual(rows.filter((row) => row.tone === 'sakit').map((row) => row.date), ['2026-11-17', '2026-11-16']);
});


test('HRD rejection reason is retained in employee detail, approval card and attendance today or history', () => {
  const raw = { ...base, approvalStatus: 'REJECTED', reviewNote: 'Tanggal pengajuan tidak sesuai', reviewedAt: '2026-11-13T10:00:00' };
  const record = toDisplayRecord(raw);
  assert.equal(record.reviewNote, raw.reviewNote);
  const model = buildSickCardModel(record);
  assert.ok(model.hint.includes(raw.reviewNote));
  const item = buildPengajuanItems({ attendanceRecords: [record] })[0];
  assert.ok(buildRequestDetail(item, model).sections.some((section) => section.label === 'Alasan Penolakan HRD' && section.value === raw.reviewNote));
  for (const now of [new Date('2026-11-13T12:00:00'), new Date('2026-11-16T12:00:00')]) {
    const row = buildMonthlyRows([record], 2026, 10, now, [], 'REGULAR', {}).find((day) => day.date === base.attendanceDate);
    assert.ok(resolveNoteMeta(row).detail.includes(raw.reviewNote));
    assert.ok(resolveNoteMeta(row).actions.some((action) => action.type === 'uploadDocument'));
  }
});
test('rejected early-checkout sick request shows HRD reason alongside actual attendance', () => {
  const rejected = toDisplayRecord({ ...base, action: 'SAKIT', approvalStatus: 'REJECTED', reviewNote: 'Alasan tidak sesuai' });
  const presence = toDisplayRecord({ ...base, attendanceId: 2, action: 'MASUK', reason: 'ABSEN', approvalStatus: 'NOT_REQUIRED' });
  const row = buildMonthlyRows([presence, rejected], 2026, 10, new Date('2026-11-13T12:00:00'), [], 'REGULAR', {}).find((day) => day.date === base.attendanceDate);
  assert.ok(resolveNoteMeta(row).detail.includes('Alasan tidak sesuai'));
});

test('legacy rejected complete request shows rejected letter and reupload action instead of waiting verification', () => {
  const raw = { ...base, approvalStatus: 'REJECTED', documentReviewStatus: 'PENDING', reviewNote: 'Surat tidak sesuai' };
  const status = medicalDocumentStatus(raw, new Date('2026-11-13T12:00:00Z'));
  assert.equal(status.code, 'REJECTED'); assert.equal(status.canUpload, true);
  assert.equal(status.note, raw.reviewNote);
});
