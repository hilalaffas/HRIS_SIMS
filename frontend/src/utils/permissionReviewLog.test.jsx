import LateEvidenceField from '../pages/Absensi/components/LateEvidenceField';
import RequestDetail from '../pages/PersetujuanIzin/components/RequestDetail';
import { sickApprovalStatus } from './sickApprovalStatus';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPermissionLogs, permissionFileStatus } from './permissionReviewLog';
import { toPermissionRow } from '../pages/PersetujuanIzin/utils/permissionRequest';
import PermissionHistoryList from '../pages/PersetujuanIzin/components/PermissionHistoryList';
import { buildRequestDetail, buildPengajuanItems } from '../pages/Pengajuan/utils/pengajuanItems';
import { toDisplayRecord } from '../services/attendanceService';
import { buildSickCardModel } from './approvalCardModels';

globalThis.window = { location: { origin: 'https://example.com' } };
const base = { attendanceId: 1, employeeName: 'Pemohon', divisionName: 'TTSI', action: 'MASUK', reason: 'SAKIT', attendanceDate: '2026-11-17', recordedAt: '2026-11-17T09:00:00', sickStartDate: '2026-11-17', sickEndDate: '2026-11-18', leaveDays: 2, approvalStatus: 'APPROVED', documentUploadDeadline: '2099-11-20', documentRequired: true, documentUrl: 'https://example.com/doctor.pdf', documentReviewStatus: 'PENDING' };
const events = [
  { eventType: 'SUBMITTED', eventAt: '2026-11-17T09:00:00', actorName: 'Pemohon', actorRole: 'KARYAWAN', note: 'Demam' },
  { eventType: 'DOCUMENT_REJECTED', eventAt: '2026-11-17T10:00:00', actorName: 'Pemeriksa HRD', actorRole: 'HRD_ADMIN', note: 'Cap tidak jelas', documentUrl: 'https://example.com/first.pdf', beforeStartDate: '2026-11-17', beforeEndDate: '2026-11-17', afterStartDate: '2026-11-17', afterEndDate: '2026-11-18' },
  { eventType: 'COMPLETED', eventAt: '2026-11-17T11:00:00', actorName: 'Pemeriksa HRD', actorRole: 'HRD_ADMIN', note: 'Izin dan surat disetujui' },
];
test('file completion requires both approved leave and valid certificate', () => {
  assert.equal(permissionFileStatus(toPermissionRow(base)).code, 'VERIFICATION');
  assert.equal(permissionFileStatus(toPermissionRow({ ...base, documentReviewStatus: 'VALID' })).code, 'COMPLETE');
  assert.equal(permissionFileStatus(toPermissionRow({ ...base, approvalStatus: 'REJECTED' })).code, 'REJECTED');
  assert.equal(permissionFileStatus(toPermissionRow({ ...base, approvalStatus: 'PENDING' })).code, 'PENDING');
  assert.equal(toPermissionRow(base).documentReviewPending, true);
});
test('all rows are visible in read-only four-column history without approval actions', () => {
  const rows = [base, { ...base, attendanceId: 2, approvalStatus: 'PENDING' }, { ...base, attendanceId: 3, approvalStatus: 'REJECTED' }].map(toPermissionRow);
  const html = renderToStaticMarkup(<PermissionHistoryList approvals={{ rows, loading: false, loadError: '' }} />);
  for (const label of ['Karyawan Pemohon', 'Status Berkas', 'Log Detail', 'Rincian']) assert.ok(html.includes(label));
  assert.equal((html.match(/role="columnheader"/g) || []).length, 4);
  assert.ok(!html.includes('IZIN-'));
  assert.equal((html.match(/class="leaveList__name"/g) || []).length, 3);
  assert.ok(!html.includes('pzn-btn--approve')); assert.ok(!html.includes('pzn-btn--reject'));
});
test('per-event actor, rejection reason, document version and dates are retained in order', () => {
  const logs = buildPermissionLogs({ reviewEvents: events });
  assert.deepEqual(logs.map((log) => log.statusBadge), ['DIAJUKAN', 'SURAT DITOLAK', 'DISETUJUI LENGKAP']);
  assert.ok(logs[1].nama.includes('Pemeriksa HRD'));
  assert.ok(logs[1].catatan.includes('Cap tidak jelas'));
  assert.ok(logs[1].catatan.includes('18/11/2026'));
  assert.equal(logs[1].documentUrl, 'https://example.com/first.pdf');
  assert.ok(logs[1].waktu.endsWith('WIB'));
});
test('employee detail uses the same permanent history and legacy data is clearly labelled', () => {
  const record = toDisplayRecord({ ...base, reviewEvents: events });
  const item = buildPengajuanItems({ attendanceRecords: [record] })[0];
  assert.equal(buildRequestDetail(item, buildSickCardModel(record)).logs.length, 3);
  assert.equal(buildPermissionLogs({})[0].statusBadge, 'DATA LAMA');
});


test('processing queue uses four-column table with Proses and includes certificate reviews only when actionable', () => {
  const rows = [
    { ...base, attendanceId: 1, approvalStatus: 'PENDING' },
    { ...base, attendanceId: 2, documentReviewStatus: 'PENDING' },
    { ...base, attendanceId: 3, documentReviewStatus: 'VALID' },
    { ...base, attendanceId: 4, approvalStatus: 'REJECTED' },
  ].map(toPermissionRow);
  const html = renderToStaticMarkup(<PermissionHistoryList mode="queue" approvals={{ rows, loading: false, loadError: '', processingIds: new Set() }} />);
  assert.ok(html.includes('Total Antrean')); assert.ok(html.includes('2 Data'));
  assert.ok(html.includes('>Aksi</div>')); assert.ok(!html.includes('Log Detail'));
  assert.equal((html.match(/Proses<\/button>/g) || []).length, 2);
  assert.ok(html.includes('Proses')); assert.ok(!html.includes('Rincian'));
  assert.equal((html.match(/role="columnheader"/g) || []).length, 4);
});


test('five certificate workflow states are consistent across HRD and employee models', () => {
  const cases = [
    [{ approvalStatus: 'PENDING', documentUrl: null }, 'Menunggu ACC', 'warning'],
    [{ approvalStatus: 'PENDING' }, 'Menunggu ACC', 'warning'],
    [{ documentUrl: null }, 'Disetujui (Belum Lengkap)', 'info'],
    [{ documentReviewStatus: 'PENDING' }, 'Verifikasi Surat', 'purple'],
    [{ documentReviewStatus: 'REJECTED' }, 'Revisi Surat', 'danger'],
    [{ documentReviewStatus: 'VALID' }, 'Disetujui', 'success'],
    [{ approvalStatus: 'REJECTED' }, 'Ditolak', 'danger'],
  ];
  for (const [fields, label, tone] of cases) {
    const raw = { ...base, ...fields };
    const record = toDisplayRecord(raw);
    assert.equal(sickApprovalStatus(record).label, label);
    assert.equal(permissionFileStatus(toPermissionRow(raw)).label, label);
    const model = buildSickCardModel(record);
    assert.equal(model.badgeLabel, label); assert.equal(model.tone, tone);
    const item = buildPengajuanItems({ attendanceRecords: [record] })[0];
    assert.equal(item.statusLabel, label); assert.equal(item.statusTone, tone);
  }
});


test('attached sick request can be approved without checkboxes and keeps employee note field', () => {
  const row = toPermissionRow({ ...base, approvalStatus: 'PENDING' });
  const html = renderToStaticMarkup(<RequestDetail row={row} processing={false} onApprove={() => {}} onReject={() => {}} />);
  assert.ok(!html.includes('type="checkbox"'));
  assert.ok(html.includes('Catatan untuk karyawan'));
  assert.ok(html.includes('Setujui Izin')); assert.ok(html.includes('Tolak Izin'));
  const approve = html.match(/<button[^>]*class="pzn-btn pzn-btn--approve"[^>]*>/)?.[0];
  assert.ok(approve); assert.ok(!approve.includes('disabled'));
});
test('HRD approval note without a certificate is visible in employee detail and card', () => {
  const record = toDisplayRecord({ ...base, documentUrl: null, reviewNote: 'Silakan istirahat, surat dokter tetap wajib disusulkan.' });
  const model = buildSickCardModel(record);
  const item = buildPengajuanItems({ attendanceRecords: [record] })[0];
  const detail = buildRequestDetail(item, model);
  assert.ok(detail.sections.some((section) => section.label === 'Catatan HRD untuk Karyawan' && section.value === record.reviewNote));
  assert.ok(model.hint.includes(record.reviewNote));
  assert.ok(!model.hint.includes('Alasan Penolakan'));
});


test('late evidence uses one upload area without a duplicate photo button', () => {
  const html = renderToStaticMarkup(<LateEvidenceField file={null} onChange={() => {}} onError={() => {}} />);
  assert.equal((html.match(/type="file"/g) || []).length, 1);
  assert.ok(html.includes('Klik untuk ambil foto / upload file bukti'));
  assert.ok(!html.includes('late-evidence__camera'));
  assert.ok(html.includes('application/pdf')); assert.ok(html.includes('Bukti wajib dilampirkan'));
});
test('late permission enters HRD queue with attachment and employee decision note', () => {
  const raw = { ...base, action: 'IZIN', reason: 'IZIN', approvalStatus: 'PENDING', documentRequired: false, documentReviewStatus: 'NOT_REQUIRED', sickStartDate: null, sickEndDate: null };
  const row = toPermissionRow(raw);
  assert.equal(row.type, 'TERLAMBAT'); assert.ok(row.attachment);
  const html = renderToStaticMarkup(<RequestDetail row={row} processing={false} onApprove={() => {}} onReject={() => {}} />);
  assert.ok(html.includes('Bukti Terlambat')); assert.ok(!html.includes('Status Surat Dokter'));
  assert.ok(html.includes('Setujui Izin')); assert.ok(html.includes('Tolak Izin'));
  const record = toDisplayRecord({ ...raw, approvalStatus: 'APPROVED', reviewNote: 'Bukti diterima HRD' });
  const item = buildPengajuanItems({ attendanceRecords: [record] })[0];
  assert.equal(item.statusLabel, 'Disetujui'); assert.equal(item.requiresApproval, true);
  const detail = buildRequestDetail(item);
  assert.ok(detail.fields.some((field) => field.label === 'Bukti Terlambat' && field.href));
  assert.ok(detail.sections.some((section) => section.value === 'Bukti diterima HRD'));
});


test('late permission on weekend stays on its exact date instead of extending to Monday', () => {
  const row = toPermissionRow({ ...base, action: 'IZIN', reason: 'IZIN', approvalStatus: 'PENDING', documentRequired: false, attendanceDate: '2026-11-21', sickStartDate: null, sickEndDate: null });
  assert.equal(+row.startDate, +row.endDate); assert.equal(row.workDays, 1);
});
