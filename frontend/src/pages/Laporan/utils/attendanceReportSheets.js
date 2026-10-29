// src/pages/Laporan/utils/attendanceReportSheets.js
//
// [BARU] Menyusun "sheet" ekspor dari laporan karyawan. SATU sumber untuk CSV
// dan PDF (dan siap dipakai XLSX bila nanti dibutuhkan):
//   - sheet pertama  : "Ringkasan" semua karyawan (hanya bila > 1 karyawan)
//   - sheet berikutnya: SATU karyawan = SATU sheet (PDF: satu halaman,
//                       CSV: satu blok bertitle, dipisah baris kosong)
import { formatOvertimeDuration } from '../../../services/overtimeService';
import { parseLocalDate } from '../../../services/attendanceService';

export const SUMMARY_HEADERS = [
  'No', 'NIK', 'Nama Karyawan', 'Jabatan', 'Divisi',
  'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Cuti', 'Alpha', 'Lembur (ACC)',
];

export const DAILY_HEADERS = [
  'Tanggal', 'Hari', 'Jadwal Shift', 'Jam Masuk', 'Jam Pulang', 'Durasi', 'Status', 'Lembur', 'Keterangan',
];
export const DAILY_STATUS_COLUMN = 6; // indeks kolom "Status" (diberi warna di PDF)

const formatDayName = (dateKey) => parseLocalDate(dateKey)
  ?.toLocaleDateString('id-ID', { weekday: 'long' }) || '-';

const formatLeaveDays = (value) => (value ? String(Number(value.toFixed(1))).replace('.', ',') : '0');

const formatOvertimeText = (overtime) => {
  if (!overtime) return '-';
  if (overtime.tone === 'rejected') return 'Ditolak';
  return `${overtime.duration} (${overtime.statusLabel})`;
};

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
    formatOvertimeText(row.overtime),
    row.note,
  ]);
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
