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
  getCurrentPeriod,
  getPeriodRange,
} from '../../Absensi/utils/monthlyAttendance';
import { attachReportEdits } from './reportEdits';
import { applyOvertimeAcc } from './overtimeAcc'; // [BARU]

// Nilai tone baris laporan (dipakai badge di layar & warna PDF):
// hadir | telat | sakit | menunggu | ditolak | izin | leave | alpha | belum | ''
const OPEN_TONES = ['alpha', 'belum']; // baris yang boleh ditimpa cuti / "belum bergabung"

export function getReportDateRange(period) {
  const { start, end } = getPeriodRange(period.year, period.month);
  return { from: dateKey(start), to: dateKey(end), start, end };
}

// [BARU] Periode tutup buku yang menyentuh rentang [from, to] (urut naik). Rentang
// "Hari Ini" / tanggal pilihan bisa jatuh di dalam satu periode atau melewati beberapa.
function listPeriodsInRange(from, to) {
  const last = getCurrentPeriod(parseLocalDate(to));
  const lastIndex = last.year * 12 + last.month;
  const periods = [];
  let cursor = getCurrentPeriod(parseLocalDate(from));
  while (cursor.year * 12 + cursor.month <= lastIndex) {
    periods.push(cursor);
    const next = new Date(cursor.year, cursor.month + 1, 1);
    cursor = { year: next.getFullYear(), month: next.getMonth() };
  }
  return periods;
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
    present: 0, late: 0, lateMinutes: 0, sick: 0, izin: 0, leave: 0, absent: 0, pending: 0,
    overtimeMinutes: 0, overtimeAccMinutes: 0,
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
  summary.overtimeAccMinutes = rows.reduce((total, row) => total + (row.overtimeAccMinutes || 0), 0);
  return summary;
}

// ---------- entry point ----------

// employee = satu elemen `employees` dari GET /api/absensi/laporan.
// [UBAH] range = { from, to } ('YYYY-MM-DD'), menggantikan `period`: baris dibangun per
// periode tutup buku yang tersentuh lalu dipotong ke [from, to].
// Baris dikembalikan URUT TANGGAL NAIK (laporan dibaca dari awal rentang).
export function buildEmployeeReport(
  employee,
  { range, holidaysByDate = LOCAL_HOLIDAYS_2026, now = new Date() },
) {
  const records = (employee.attendances || []).map(toDisplayRecord);
  // Keep attendance evidence on its server-assigned work date (including overnight shifts).
  const evidenceByDate = new Map();
  records.forEach((record) => {
    if (record.reasonCode !== 'ABSEN' || !['MASUK', 'KELUAR'].includes(record.actionCode)) return;
    const evidence = evidenceByDate.get(record.attendanceDate) || {};
    const key = record.actionCode === 'MASUK' ? 'checkInEvidence' : 'checkOutEvidence';
    if (!evidence[key] || record.recordedAt < evidence[key].recordedAt) evidence[key] = record;
    evidenceByDate.set(record.attendanceDate, evidence);
  });
  const overtimes = (employee.overtimes || []).map(toDisplayOvertime);
  const leaveDayMap = buildLeaveDayMap(employee.leaves);

  const baseRows = listPeriodsInRange(range.from, range.to).flatMap((period) => attachOvertime(
    buildMonthlyRows(
      records, period.year, period.month, now,
      employee.schedules || [], employee.divisionType, holidaysByDate,
    ),
    overtimes,
  ));
  const rows = baseRows
    .filter((row) => row.date >= range.from && row.date <= range.to)
    .map((row) => ({ ...normalizeRow(row, { joinDate: employee.joinDate, leaveDayMap }), ...evidenceByDate.get(row.date) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1)); // terlama dulu

  // [UBAH] Hitungan lembur ACC (pengali jam) dipisah ke utils/overtimeAcc.js.
  const reportRows = applyOvertimeAcc(attachReportEdits(rows, employee, now), overtimes, {
    holidaysByDate,
    divisionType: employee.divisionType,
  });

  return {
    employeeId: employee.employeeId,
    fullName: employee.fullName || '-',
    nik: employee.nik || '-',
    position: employee.position || '-',
    divisionType: employee.divisionType || 'REGULAR',
    divisionId: employee.divisionId ?? null,
    divisionName: employee.divisionName || 'Tanpa Divisi',
    rows: reportRows,
    summary: summarizeRows(reportRows, overtimes),
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
