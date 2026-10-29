// src/services/attendanceReportService.js
//
// [BARU] Lapisan service Laporan Absensi (khusus HRD_ADMIN / SUPER_ADMIN),
// dipanggil dari pages/Laporan/hooks/useAttendanceReport.js.
//
// GET /api/absensi/laporan?from=YYYY-MM-DD&to=YYYY-MM-DD[&divisiId=N]
// -> { from, to, employees: [{ employeeId, fullName, nik, position, joinDate,
//      divisionId, divisionName, divisionType, attendances[], schedules[],
//      overtimes[], leaves[] }] }
// Data MENTAH per karyawan; baris harian & ringkasan disusun di frontend
// (pages/Laporan/utils/attendanceReportBuilder.js).
import { api } from './api';

// divisionId kosong / null = semua divisi.
// `config` opsional ({ silent: true } agar LoadingScreen global tidak menyala,
// halaman Laporan punya skeleton sendiri). Lihat services/api.js.
export async function getAttendanceReport({ from, to, divisionId }, config = {}) {
  const query = new URLSearchParams({ from, to });
  if (divisionId) query.set('divisiId', String(divisionId));
  return api.get(`/api/absensi/laporan?${query.toString()}`, config);
}
