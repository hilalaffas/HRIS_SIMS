import { sickTodayWib } from './sickDates';

export function sickDocumentDeadline(record) {
  if (record.documentUploadDeadline) return record.documentUploadDeadline;
  const date = record.recordedAt;
  const key = date instanceof Date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : String(date || record.attendanceDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
  const [year, month, day] = key.split('-').map(Number);
  const limit = new Date(Date.UTC(year, month - 1 + (day > 20 ? 1 : 0), 20));
  return limit.toISOString().slice(0, 10);
}
export function isSickDocumentExpired(record, now = new Date()) {
  const deadline = sickDocumentDeadline(record);
  return Boolean(record.documentRequired && deadline && sickTodayWib(now) > deadline
    && (!record.documentUrl || record.documentReviewStatus === 'REJECTED' || record.approvalStatus === 'REJECTED'));
}
