// src/services/overtimeService.js
//
// Lapisan service modul Pengajuan Lembur, dipakai halaman Lembur
// (pages/Lembur/Lembur.jsx) dan kolom "Lembur" di tabel Absensi
// (pages/Absensi/utils/monthlyAttendance.js). Pola sama dengan
// attendanceService.js: data MENTAH dari backend, diformat di sini.
import { api } from './api';

export async function getMyOvertime() {
  return api.get('/api/lembur/me');
}

// POST pengajuan lembur. Total jam & status dihitung backend, jadi tidak dikirim.
export async function submitOvertime({ overtimeDate, startTime, endTime, reason }) {
  return api.post('/api/lembur/me', { overtimeDate, startTime, endTime, reason });
}

// [BARU] Persetujuan Lembur (SuperAdmin): daftar semua pengajuan & keputusan.
// status: 'APPROVED' | 'REJECTED'
export async function getOvertimeApprovals() {
  return api.get('/api/lembur/approvals');
}

export async function decideOvertimeApproval(overtimeId, status) {
  return api.put(`/api/lembur/${overtimeId}/approval`, { status });
}

export const OVERTIME_STATUS = {
  PENDING: { label: 'MENUNGGU ACC', shortLabel: 'MENUNGGU', tone: 'pending' },
  APPROVED: { label: 'APPROVED (ACC)', shortLabel: 'ACC', tone: 'approved' },
  REJECTED: { label: 'DITOLAK', shortLabel: 'DITOLAK', tone: 'rejected' },
};

export const getOvertimeStatus = (code) => (
  OVERTIME_STATUS[String(code || '').toUpperCase()] || { label: code || '-', shortLabel: code || '-', tone: 'pending' }
);

// 120 -> "2 Jam", 90 -> "1 Jam 30 Mnt", 45 -> "45 Mnt"
export function formatOvertimeDuration(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '-';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} Mnt`;
  if (minutes === 0) return `${hours} Jam`;
  return `${hours} Jam ${minutes} Mnt`;
}

// Backend mengirim "17:00:00" -> tampil "17:00"
const toClockLabel = (time) => (time ? String(time).slice(0, 5) : '-');

export function toDisplayOvertime(item) {
  return {
    id: item.overtimeId,
    employeeName: item.employeeName || '-', // [BARU] dipakai halaman Persetujuan
    date: item.overtimeDate, // "2026-09-28"
    startTime: toClockLabel(item.startTime),
    endTime: toClockLabel(item.endTime),
    totalMinutes: item.totalMinutes,
    duration: formatOvertimeDuration(item.totalMinutes),
    reason: item.reason || '-',
    statusCode: String(item.status || '').toUpperCase(),
  };
}
