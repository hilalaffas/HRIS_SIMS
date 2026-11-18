import { sickApprovalStatus } from './sickApprovalStatus';
import { parseNaiveDateTime } from '../services/attendanceService';

const LABELS = {
  SUBMITTED: 'DIAJUKAN', EVIDENCE_UPLOADED: 'BUKTI DIUNGGAH', DOCUMENT_UPLOADED: 'SURAT DIUNGGAH', DOCUMENT_REUPLOADED: 'SURAT DIUNGGAH ULANG',
  RESUBMITTED: 'DIAJUKAN ULANG', PERMISSION_APPROVED: 'IZIN DISETUJUI', PERMISSION_REJECTED: 'IZIN DITOLAK',
  DOCUMENT_VALID: 'SURAT VALID', DOCUMENT_REJECTED: 'SURAT DITOLAK', COMPLETED: 'DISETUJUI LENGKAP',
  LEGACY_SNAPSHOT: 'DATA LAMA',
};
const date = (key) => key?.split('-').reverse().join('/') || '-';
const period = (start, end) => start ? `${date(start)} – ${date(end || start)}` : '';

export function buildPermissionLogs(record) {
  const events = record.reviewEvents || [];
  if (!events.length) return [{ statusBadge: 'DATA LAMA', nama: record.employeeName || 'Karyawan', waktu: '-', catatan: 'Riwayat pemeriksaan belum tersedia lengkap untuk data ini.' }];
  return events.map((event) => {
    const at = parseNaiveDateTime(event.eventAt);
    const before = period(event.beforeStartDate, event.beforeEndDate);
    const after = period(event.afterStartDate, event.afterEndDate);
    const periodLabel = ['DOCUMENT_UPLOADED', 'DOCUMENT_REUPLOADED', 'DOCUMENT_REJECTED', 'RESUBMITTED'].includes(event.eventType) ? 'Periode pada surat' : 'Periode izin';
    const change = after && before && before !== after ? `${periodLabel}: ${before} → ${after}` : after ? `${periodLabel}: ${after}` : '';
    const izin = { PENDING: 'Menunggu', APPROVED: 'Disetujui', REJECTED: 'Ditolak', NOT_REQUIRED: 'Tercatat' };
    const surat = { PENDING: 'Menunggu verifikasi', VALID: 'Valid', REJECTED: 'Ditolak', NOT_UPLOADED: 'Belum diunggah', NOT_REQUIRED: 'Tidak diperlukan' };
    const status = [event.approvalStatus && `Izin: ${izin[event.approvalStatus] || event.approvalStatus}`, event.documentStatus && `Surat: ${surat[event.documentStatus] || event.documentStatus}`].filter(Boolean).join(' · ');
    return {
      statusBadge: LABELS[event.eventType] || event.eventType,
      nama: `${event.actorName || '-'}${event.actorRole ? ` (${event.actorRole})` : ''}`,
      waktu: at ? `${at.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}, ${at.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} WIB` : '-',
      catatan: [event.note, change, status].filter(Boolean).join(' · '),
      documentUrl: event.documentUrl,
    };
  });
}

export function permissionFileStatus(row) {
  const status = sickApprovalStatus({ ...row.source, approvalStatus: row.status }, row.document);
  return { ...status, statusTone: status.tone, tone: status.tableTone };
}
