// src/utils/overtimeLog.js
//
// [BARU] Menyusun daftar "Riwayat Log Pemeriksaan" untuk satu pengajuan lembur.
// Dipakai dua popup supaya isinya selalu sama:
//   - components/OvertimeDetailModal.jsx          (sisi approver)
//   - pages/Pengajuan/components/RequestDetailModal.jsx (sisi pemohon)
//
// Isi log: "DIAJUKAN" (saat pengajuan dibuat) + keputusan tiap approver yang sudah bertindak
// (DISETUJUI / DITOLAK, lengkap dengan catatan). Tahap yang masih menunggu tidak masuk log.
//
// Contoh pemakaian:
// const logs = buildOvertimeLogs({ employeeName: 'Budi', createdAt: '2026-10-24T09:05:11', approvals });
import { formatActedAt } from './approvalProgress';

const ROLE_LABEL = { LEADER: 'Leader', SPV: 'SPV', MANAGER: 'Manager', HRD: 'HRD' };

// "2026-10-24T09:05:11" -> "2026-10-24 09:05" (format yang dibaca formatActedAt)
export const toActedAtText = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '');

export const getLogTone = (badge = '') => {
  if (badge === 'DISETUJUI') return 'success';
  if (badge === 'DITOLAK') return 'danger';
  return 'neutral';
};

export function buildOvertimeLogs({ employeeName, createdAt, approvals = [] }) {
  const submitted = createdAt
    ? [{ statusBadge: 'DIAJUKAN', nama: employeeName || '-', waktu: formatActedAt(toActedAtText(createdAt)), catatan: '' }]
    : [];

  const decisions = approvals
    .filter((step) => step.action === 'APPROVED' || step.action === 'REJECTED')
    .map((step) => ({
      statusBadge: step.action === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK',
      nama: `${step.employeeName || '-'} (${ROLE_LABEL[String(step.role).toUpperCase()] || step.role})`,
      waktu: formatActedAt(toActedAtText(step.actedAt)),
      catatan: step.note || '',
    }));

  return [...submitted, ...decisions];
}
