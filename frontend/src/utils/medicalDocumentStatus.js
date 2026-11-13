import { sickDocumentDeadline, isSickDocumentExpired } from './sickDocumentDeadline';
import { calendarDayCount } from './sickDates';
// Approval of sick leave and verification of its medical certificate are separate.
export function medicalDocumentStatus(record, now = new Date()) {
  const required = Boolean(record.documentRequired);
  const expired = isSickDocumentExpired(record, now);
  const code = expired ? 'EXPIRED' : !required ? 'NOT_REQUIRED' : record.approvalStatus === 'REJECTED' ? 'REJECTED' : !record.documentUrl ? 'NOT_UPLOADED' : record.documentReviewStatus || 'PENDING';
  const meta = {
    EXPIRED: { label: 'Batas upload surat dokter terlewati · Absensi tanpa keterangan', tone: 'danger' },
    NOT_REQUIRED: { label: 'Surat tidak diperlukan', tone: 'success' },
    NOT_UPLOADED: { label: 'Surat belum diunggah', tone: 'warning' },
    PENDING: { label: 'Surat menunggu verifikasi HRD', tone: 'warning' },
    VALID: { label: 'Surat dokter valid', tone: 'success' },
    REJECTED: { label: 'Surat ditolak HRD', tone: 'danger' },
  }[code] || { label: 'Surat menunggu verifikasi HRD', tone: 'warning' };
  const format = (key) => key?.split('-').reverse().join('/');
  const periodLabel = record.documentStartDate && record.documentEndDate
    ? `${format(record.documentStartDate)} – ${format(record.documentEndDate)} (${calendarDayCount(record.documentStartDate, record.documentEndDate)} hari kalender)` : '';
  return { ...meta, code, periodLabel, deadline: sickDocumentDeadline(record), note: record.documentReviewNote || (record.approvalStatus === 'REJECTED' ? record.reviewNote : '') || '', canUpload: required && ['NOT_UPLOADED', 'REJECTED'].includes(code) };
}
