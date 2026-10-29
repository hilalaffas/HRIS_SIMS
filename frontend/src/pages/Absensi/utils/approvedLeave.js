// src/pages/Absensi/utils/approvedLeave.js
//
// [BARU] Menempelkan CUTI YANG SUDAH DISETUJUI (modul Cuti) ke baris
// "Jadwal & Log Absensi Bulanan". Data absensi tidak memuat cuti, jadi tanpa ini
// hari cuti terbaca "TANPA KETERANGAN (Alpha)".
//
// Aturan: hanya baris yang masih "kosong" (tone alpha / belum) yang ditimpa.
// Baris yang punya catatan absensi (hadir, sakit, izin, ...) dan hari libur /
// akhir pekan (tanpa tone) tidak diubah. Hasilnya memakai tone 'cuti' yang sudah
// punya gaya badge (.abs-status-cuti) dan warna PDF.
import { parseLocalDate } from '../../../services/attendanceService';
import { dateKey } from './monthlyAttendance';

const APPROVED_PREFIX = 'disetujui'; // status dari CutiService: "Disetujui (ACC)"
const OPEN_TONES = ['alpha', 'belum'];

// leaves: hasil getRiwayatByUser() (mapMyLeave). Hanya yang berstatus disetujui dipakai.
export function filterApprovedLeaves(leaves = []) {
  return leaves.filter((leave) => String(leave.status || '').toLowerCase().startsWith(APPROVED_PREFIX));
}

// { 'YYYY-MM-DD': 'Cuti: Cuti Tahunan (Pagi)' }
function buildLeaveLabelMap(leaves) {
  const labelMap = {};
  leaves.forEach((leave) => {
    const { startDate, endDate, jenisCuti, session } = leave.rawDetail || {};
    const end = parseLocalDate(String(endDate || '').split('T')[0]);
    const sessionText = session ? ` (${session === 'SIANG' ? 'Siang' : 'Pagi'})` : '';
    const label = `Cuti: ${jenisCuti || 'Cuti'}${sessionText}`;
    for (
      let cursor = parseLocalDate(String(startDate || '').split('T')[0]);
      cursor && end && cursor <= end;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    ) {
      labelMap[dateKey(cursor)] = label;
    }
  });
  return labelMap;
}

export function attachApprovedLeave(rows, approvedLeaves = []) {
  if (approvedLeaves.length === 0) return rows;
  const labelMap = buildLeaveLabelMap(approvedLeaves);
  return rows.map((row) => {
    const label = labelMap[row.date];
    if (!label || !OPEN_TONES.includes(row.tone)) return row;
    return { ...row, status: 'CUTI', tone: 'cuti', note: label, noteDetail: label };
  });
}
