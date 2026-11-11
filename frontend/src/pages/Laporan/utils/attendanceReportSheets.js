// src/pages/Laporan/utils/attendanceReportSheets.js
//
// [BARU] Menyusun data ekspor dari laporan karyawan.
//   XLSX & PDF -> "sheet" (buildExportSheets):
//     - sheet pertama   : "Ringkasan" semua karyawan (hanya bila > 1 karyawan)
//     - sheet berikutnya: SATU karyawan = SATU sheet / halaman
//   CSV -> SATU tabel panjang tanpa ringkasan (buildFlatCsvTable): satu baris per
//     karyawan per hari, kolom identitas karyawan di depan. Berlaku sama untuk
//     semua divisi maupun satu divisi.
import { parseLocalDate } from '../../../services/attendanceService';

export const SUMMARY_HEADERS = [
  'No', 'NIK', 'Nama Karyawan', 'Jabatan', 'Divisi',
  'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Cuti', 'Alpha', 'Lembur (ACC)',
];

// [UBAH] Kolom "Lembur" dipecah: Jam Mulai Lembur, Jam Selesai Lembur, Total Lembur.
export const DAILY_HEADERS = [
  'Tanggal', 'Hari', 'Jadwal Shift', 'Cuti', 'Sakit', 'Jam Masuk', 'Jam Pulang', 'Durasi',
  'Masuk', 'Pulang', 'Istirahat', 'Status',
  'Jam Mulai Lembur', 'Jam Selesai Lembur', 'Total Lembur', 'Keterangan',
];
// Kolom identitas yang ditaruh di depan setiap baris CSV (tabel datar).
export const CSV_IDENTITY_HEADERS = ['NIK', 'Nama Karyawan', 'Jabatan', 'Divisi'];
export const DAILY_STATUS_COLUMN = 11; // indeks kolom "Status" (diberi warna di PDF)

// [UBAH] Tabel statis menggantikan toLocaleDateString() per baris (Intl dibuat ulang
// di setiap panggilan -> lambat untuk ratusan karyawan x 31 hari). Hasilnya sama.
const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const formatDayName = (dateKey) => {
  const date = parseLocalDate(dateKey);
  return date ? DAY_NAMES_ID[date.getDay()] : '-';
};

const ENGLISH_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatExportDate = (dateKey) => {
  const date = parseLocalDate(dateKey);
  if (!date) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${ENGLISH_MONTHS[date.getMonth()]}-${year}`;
};

const formatLeaveDays = (value) => (value ? String(Number(value.toFixed(1))).replace('.', ',') : '0');
// [UBAH] Diekspor supaya tabel/modal di layar memakai angka yang SAMA dengan file ekspor.
const accHoursFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
export const formatAccHours = (minutes) => `${accHoursFormatter.format(Number((Number(minutes || 0) / 60).toFixed(2)))} Jam`;

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
      formatAccHours(summary.overtimeAccMinutes),
    ];
  });
}

// [BARU] Jadwal terencana (jam masuk, jam pulang, istirahat) dari label shift.
// Shift reguler memakai 08:00-17:00; istirahat standar 30 menit untuk shift <= 6 jam,
// selain itu 1 jam. Hari libur / jadwal belum ada -> '-'.
const SCHEDULE_TIMES_PATTERN = /\((\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\)/;
const REGULAR_START = '08:00';
const REGULAR_END = '17:00';
const SHORT_SHIFT_MINUTES = 6 * 60;
const MINUTES_PER_DAY = 24 * 60;

const clockToMinutes = (clock) => {
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
};

function buildPlannedWork(shiftLabel, isRegular) {
  const label = String(shiftLabel || '');
  const scheduled = label.match(SCHEDULE_TIMES_PATTERN);
  const hasRegularHours = isRegular && label !== 'Libur';
  const start = scheduled?.[1] || (hasRegularHours ? REGULAR_START : '');
  const end = scheduled?.[2] || (hasRegularHours ? REGULAR_END : '');
  if (!start || !end) return ['-', '-', '-'];

  let duration = clockToMinutes(end) - clockToMinutes(start);
  if (duration <= 0) duration += MINUTES_PER_DAY;
  const breakMinutes = duration <= SHORT_SHIFT_MINUTES ? 30 : 60;
  return [start, end, `${Math.floor(breakMinutes / 60)}:${String(breakMinutes % 60).padStart(2, '0')}`];
}

export function buildDailyRows(report) {
  const knownDivisionType = report.divisionType ? String(report.divisionType).toUpperCase() : '';
  // [UBAH] Jadwal terencana di-cache per label shift: satu periode hanya punya
  // beberapa label berbeda, jadi regex & hitung istirahat tidak diulang per baris.
  const plannedCache = new Map();
  const plannedWorkFor = (shiftLabel) => {
    const isRegular = knownDivisionType
      ? knownDivisionType !== 'SHIFTING'
      : !/^Shift\b/i.test(String(shiftLabel || ''));
    const cacheKey = `${isRegular}|${shiftLabel}`;
    if (!plannedCache.has(cacheKey)) plannedCache.set(cacheKey, buildPlannedWork(shiftLabel, isRegular));
    return plannedCache.get(cacheKey);
  };

  return report.rows.map((row) => {
    const [plannedStart, plannedEnd, plannedBreak] = plannedWorkFor(row.shift);
    return [
      formatExportDate(row.date),
      formatDayName(row.date),
      row.shift,
      row.tone === 'leave' ? '1' : '-',
      row.tone === 'sakit' ? '1' : '-',
      row.checkIn || '-',
      row.checkOut || '-',
      row.duration || '-',
      plannedStart,
      plannedEnd,
      plannedBreak,
      row.status,
      formatOvertimeClock(row.overtime?.startTime),
      formatOvertimeClock(row.overtime?.endTime),
      formatOvertimeTotal(row.overtime),
      row.note,
    ];
  });
}

// [BARU] Tabel CSV datar: satu header, lalu SEMUA baris harian semua karyawan berurutan.
export function buildFlatCsvTable(reports) {
  return {
    headers: [...CSV_IDENTITY_HEADERS, ...DAILY_HEADERS],
    rows: reports.flatMap((report) => {
      const identity = [report.nik, report.fullName, report.position, report.divisionName];
      const dailyRows = buildDailyRows(report).map((dailyRow) => [...identity, ...dailyRow]);
      const footerRows = buildSummaryRowsVertical(report).map(([label, value]) => {
        const row = Array(DAILY_HEADERS.length).fill('');
        row[0] = label;
        row[1] = value;
        return [...identity, ...row];
      });
      return [...dailyRows, ...footerRows];
    }),
  };
}

const buildSummaryRowsVertical = ({ summary }) => [
  ['Rekap:', ''],
  ['Hadir', summary.present],
  ['Terlambat', summary.late],
  ['Sakit', summary.sick],
  ['Izin', summary.izin],
  ['Cuti', formatLeaveDays(summary.leave)],
  ['Alpha', summary.absent],
  ['Lembur ACC', formatAccHours(summary.overtimeAccMinutes)],
];

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
      footer: buildSummaryRowsVertical(report),
      statusColumn: DAILY_STATUS_COLUMN,
    });
  });

  return sheets;
}
