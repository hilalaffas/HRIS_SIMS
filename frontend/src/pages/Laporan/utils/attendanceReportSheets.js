// src/pages/Laporan/utils/attendanceReportSheets.js
//
// [BARU] Menyusun data ekspor dari laporan karyawan.
//   XLSX & PDF -> "sheet" (buildExportSheets):
//     - sheet pertama   : "Ringkasan" semua karyawan (hanya bila > 1 karyawan)
//     - sheet berikutnya: SATU karyawan = SATU sheet / halaman
//   CSV -> SATU tabel panjang tanpa ringkasan (buildFlatCsvTable): satu baris per
//     karyawan per hari, kolom identitas karyawan di depan. Berlaku sama untuk
//     semua divisi maupun satu divisi.
import { formatOvertimeDuration } from '../../../services/overtimeService';
import { parseLocalDate } from '../../../services/attendanceService';

export const SUMMARY_HEADERS = [
  'No', 'NIK', 'Nama Karyawan', 'Jabatan', 'Divisi',
  'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Cuti', 'Alpha', 'Lembur (ACC)',
];

// [UBAH] Kolom "Lembur" dipecah: Jam Mulai Lembur, Jam Selesai Lembur, Total Lembur.
export const DAILY_HEADERS = [
  'Tanggal', 'Hari', 'Jadwal Shift', 'Jam Masuk', 'Jam Pulang', 'Durasi', 'Status',
  'Jam Mulai Lembur', 'Jam Selesai Lembur', 'Total Lembur', 'Keterangan',
];
// Kolom identitas yang ditaruh di depan setiap baris CSV (tabel datar).
export const CSV_IDENTITY_HEADERS = ['NIK', 'Nama Karyawan', 'Jabatan', 'Divisi'];
export const DAILY_STATUS_COLUMN = 6; // indeks kolom "Status" (diberi warna di PDF)

const formatDayName = (dateKey) => parseLocalDate(dateKey)
  ?.toLocaleDateString('id-ID', { weekday: 'long' }) || '-';

const formatLeaveDays = (value) => (value ? String(Number(value.toFixed(1))).replace('.', ',') : '0');

// Total lembur: "2 Jam (ACC)" / "Ditolak" / "-". Jam mulai & selesai: "17:00" / "-".
const formatOvertimeTotal = (overtime) => {
  if (!overtime) return '-';
  if (overtime.tone === 'rejected') return 'Ditolak';
  return `${overtime.duration} (${overtime.statusLabel})`;
};
const formatOvertimeClock = (value) => value || '-';

export function buildSummaryRows(reports) {
  return reports.map((report, index) => {
    const { summary } = report;
    return [
      index + 1,
      report.nik,
      report.fullName,
      report.position,
      report.divisionName,
      summary.present,
      summary.late,
      summary.sick,
      summary.izin,
      formatLeaveDays(summary.leave),
      summary.absent,
      formatOvertimeDuration(summary.overtimeMinutes),
    ];
  });
}

export function buildDailyRows(report) {
  return report.rows.map((row) => [
    row.dateLabel,
    formatDayName(row.date),
    row.shift,
    row.checkIn || '-',
    row.checkOut || '-',
    row.duration || '-',
    row.status,
    formatOvertimeClock(row.overtime?.startTime),
    formatOvertimeClock(row.overtime?.endTime),
    formatOvertimeTotal(row.overtime),
    row.note,
  ]);
}

// [BARU] Tabel CSV datar: satu header, lalu SEMUA baris harian semua karyawan berurutan.
export function buildFlatCsvTable(reports) {
  return {
    headers: [...CSV_IDENTITY_HEADERS, ...DAILY_HEADERS],
    rows: reports.flatMap((report) => {
      const identity = [report.nik, report.fullName, report.position, report.divisionName];
      return buildDailyRows(report).map((dailyRow) => [...identity, ...dailyRow]);
    }),
  };
}

const buildSummaryLine = ({ summary }) => [
  `Hadir ${summary.present}`,
  `Terlambat ${summary.late}`,
  `Sakit ${summary.sick}`,
  `Izin ${summary.izin}`,
  `Cuti ${formatLeaveDays(summary.leave)}`,
  `Alpha ${summary.absent}`,
  `Lembur ACC ${formatOvertimeDuration(summary.overtimeMinutes)}`,
].join('  |  ');

// Nama file aman: huruf kecil, tanpa spasi/karakter khusus.
export const toFileSlug = (text) => String(text || 'laporan')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'laporan';

// Nama sheet <= 31 karakter, tanpa karakter terlarang Excel (: \ / ? * [ ]).
const toSheetName = (index, fullName) => `${index + 1}. ${fullName}`.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31);

// [{ key, name, title, subtitle, headers, rows, footer, statusColumn }]
export function buildExportSheets(reports, { periodLabel, scopeLabel }) {
  const sheets = [];

  if (reports.length > 1) {
    sheets.push({
      key: 'summary',
      name: 'Ringkasan',
      title: 'LAPORAN ABSENSI KARYAWAN - RINGKASAN',
      subtitle: `Cakupan: ${scopeLabel} | Periode: ${periodLabel} | Jumlah karyawan: ${reports.length}`,
      headers: SUMMARY_HEADERS,
      rows: buildSummaryRows(reports),
      footer: '',
      statusColumn: null,
    });
  }

  reports.forEach((report, index) => {
    sheets.push({
      key: `employee-${report.employeeId}`,
      name: toSheetName(index, report.fullName),
      title: `LAPORAN ABSENSI - ${report.fullName.toUpperCase()}`,
      subtitle: `NIK: ${report.nik} | Jabatan: ${report.position} | Divisi: ${report.divisionName} | Periode: ${periodLabel}`,
      headers: DAILY_HEADERS,
      rows: buildDailyRows(report),
      footer: `Rekap: ${buildSummaryLine(report)}`,
      statusColumn: DAILY_STATUS_COLUMN,
    });
  });

  return sheets;
}
