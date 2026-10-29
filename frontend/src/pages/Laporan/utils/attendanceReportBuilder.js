// src/pages/Laporan/utils/attendanceReportBuilder.js
//
// [BARU] Mengubah data mentah laporan (per karyawan) menjadi baris harian +
// ringkasan. Baris harian dibangun dengan buildMonthlyRows() yang SAMA dengan
// halaman Absensi karyawan (pages/Absensi/utils/monthlyAttendance.js), jadi
// aturan "terlambat / alpha / sakit / lembur" konsisten di kedua halaman.
// Fungsi murni (tanpa React) supaya mudah dites & dipakai ekspor.
//
// Penyesuaian khusus laporan HRD (dilakukan SETELAH baris dasar dibuat):
//   1. Hari sebelum tanggal bergabung  -> bukan Alpha ("Belum bergabung").
//   2. Hari alpha yang tercakup CUTI DISETUJUI -> status "CUTI" (data absensi
//      tidak memuat cuti, tanpa ini hari cuti terbaca Alpha).
//   3. Absensi reason IZIN diberi label "IZIN" (di halaman karyawan berlabel "CUTI").
//   4. Alasan sakit (teks bebas, bisa memuat data kesehatan) TIDAK ikut laporan.
import { LOCAL_HOLIDAYS_2026 } from '../../../constants/holidays';
import { parseLocalDate, toDisplayRecord } from '../../../services/attendanceService';
import { toDisplayOvertime } from '../../../services/overtimeService';
import {
  attachOvertime,
  buildMonthlyRows,
  dateKey,
  getPeriodRange,
} from '../../Absensi/utils/monthlyAttendance';

// Nilai tone baris laporan (dipakai badge di layar & warna PDF):
// hadir | telat | sakit | menunggu | ditolak | izin | leave | alpha | belum | ''
const OPEN_TONES = ['alpha', 'belum']; // baris yang boleh ditimpa cuti / "belum bergabung"

export function getReportDateRange(period) {
  const { start, end } = getPeriodRange(period.year, period.month);
  return { from: dateKey(start), to: dateKey(end), start, end };
}

// ---------- penyesuaian baris ----------

function markBeforeJoin(row) {
  return {
    ...row,
    status: '-',
    tone: '',
    note: 'Belum bergabung',
    checkIn: null,
    checkOut: null,
    duration: null,
    durationMinutes: null,
    overtime: null,
  };
}

// { 'YYYY-MM-DD': { label, value } } -- value 1 = sehari penuh, 0.5 = setengah hari.
function buildLeaveDayMap(leaves = []) {
  const dayMap = {};
  leaves.forEach((leave) => {
    const totalDays = Number(leave.totalDays);
    const value = totalDays > 0 && totalDays < 1 ? totalDays : 1;
    const session = leave.session ? ` (${leave.session === 'SIANG' ? 'Siang' : 'Pagi'})` : '';
    const label = `Cuti: ${leave.leaveTypeName || 'Cuti'}${session}`;
    const end = parseLocalDate(leave.endDate);
    for (
      let cursor = parseLocalDate(leave.startDate);
      cursor && end && cursor <= end;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    ) {
      dayMap[dateKey(cursor)] = { label, value };
    }
  });
  return dayMap;
}

function applyLeave(row, leaveDayMap) {
  const leave = leaveDayMap[row.date];
  if (!leave || !OPEN_TONES.includes(row.tone)) return row;
  return { ...row, status: 'CUTI', tone: 'leave', note: leave.label, leaveValue: leave.value };
}

// Catatan sakit: buang alasan bebas, sisakan info "Hari ke-N dari M".
function sanitizeNote(row) {
  const isSick = row.tone === 'sakit';
  const isSickPending = row.tone === 'menunggu' && row.status === 'MENUNGGU APPROVAL';
  if (!isSick && !isSickPending) return row;
  const dayInfo = String(row.note || '').match(/Hari ke-\d+ dari \d+/)?.[0];
  const base = isSickPending ? 'Izin sakit (menunggu persetujuan)' : 'Izin sakit';
  return { ...row, note: dayInfo ? `${base} · ${dayInfo}` : base };
}

function normalizeRow(row, { joinDate, leaveDayMap }) {
  if (joinDate && row.date < joinDate && OPEN_TONES.includes(row.tone)) return markBeforeJoin(row);
  let next = applyLeave(row, leaveDayMap);
  if (next.tone === 'cuti') next = { ...next, status: 'IZIN', tone: 'izin' };
  return sanitizeNote(next);
}

// ---------- ringkasan ----------

export function summarizeRows(rows, overtimes = []) {
  const summary = {
    present: 0, late: 0, lateMinutes: 0, sick: 0, izin: 0, leave: 0, absent: 0, pending: 0, overtimeMinutes: 0,
  };
  rows.forEach((row) => {
    switch (row.tone) {
      case 'hadir':
        summary.present += 1;
        break;
      case 'telat':
        summary.present += 1;
        summary.late += 1;
        summary.lateMinutes += row.lateMinutes || 0;
        break;
      case 'sakit':
        summary.sick += 1;
        break;
      case 'izin':
        summary.izin += 1;
        break;
      case 'leave':
        summary.leave += row.leaveValue ?? 1;
        break;
      case 'alpha':
        summary.absent += 1;
        break;
      case 'menunggu':
        summary.pending += 1;
        break;
      default:
        break;
    }
  });
  // Lembur dihitung dari pengajuan yang sudah ACC saja.
  summary.overtimeMinutes = overtimes
    .filter((item) => item.statusCode === 'APPROVED')
    .reduce((total, item) => total + (item.totalMinutes || 0), 0);
  return summary;
}

// ---------- entry point ----------

// employee = satu elemen `employees` dari GET /api/absensi/laporan.
// Baris dikembalikan URUT TANGGAL NAIK (laporan dibaca dari awal periode).
export function buildEmployeeReport(
  employee,
  { period, holidaysByDate = LOCAL_HOLIDAYS_2026, now = new Date() },
) {
  const records = (employee.attendances || []).map(toDisplayRecord);
  const overtimes = (employee.overtimes || []).map(toDisplayOvertime);
  const leaveDayMap = buildLeaveDayMap(employee.leaves);

  const baseRows = attachOvertime(
    buildMonthlyRows(
      records, period.year, period.month, now,
      employee.schedules || [], employee.divisionType, holidaysByDate,
    ),
    overtimes,
  );
  const rows = baseRows
    .map((row) => normalizeRow(row, { joinDate: employee.joinDate, leaveDayMap }))
    .reverse(); // buildMonthlyRows: terbaru dulu -> dibalik jadi terlama dulu

  return {
    employeeId: employee.employeeId,
    fullName: employee.fullName || '-',
    nik: employee.nik || '-',
    position: employee.position || '-',
    divisionId: employee.divisionId ?? null,
    divisionName: employee.divisionName || 'Tanpa Divisi',
    rows,
    summary: summarizeRows(rows, overtimes),
  };
}

// Total seluruh karyawan -- untuk kartu statistik di atas tabel.
export function summarizeAll(reports) {
  return reports.reduce((total, report) => ({
    employees: total.employees + 1,
    present: total.present + report.summary.present,
    late: total.late + report.summary.late,
    absent: total.absent + report.summary.absent,
  }), { employees: 0, present: 0, late: 0, absent: 0 });
}
