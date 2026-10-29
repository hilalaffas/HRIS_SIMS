// src/pages/Laporan/config/laporanConfig.js
//
// [BARU] Konfigurasi halaman Laporan (khusus HRD_ADMIN). Tab baru cukup
// ditambahkan di REPORT_TABS lalu dirender di Laporan.jsx.
export const REPORT_TABS = [
  { key: 'ATTENDANCE', label: 'Laporan Absen' },
];

export const DEFAULT_REPORT_TAB = 'ATTENDANCE';

// Nilai pilihan divisi untuk "Semua Divisi" (string kosong = tanpa filter).
export const ALL_DIVISIONS_VALUE = '';
export const ALL_DIVISIONS_LABEL = 'Semua Divisi';

// Format ekspor yang tersedia (urutan = urutan tombol). `icon` = nama ikon lucide
// yang dipetakan di komponen (ReportFilterBar & EmployeeReportModal).
export const EXPORT_FORMATS = [
  { key: 'xlsx', label: 'XLSX', icon: 'sheet', hint: 'Excel, satu sheet per karyawan' },
  { key: 'csv', label: 'CSV', icon: 'text', hint: 'Teks, satu tabel panjang tanpa ringkasan' },
  { key: 'pdf', label: 'PDF', icon: 'pdf', hint: 'Cetak, satu halaman per karyawan' },
];

export const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 / halaman' },
  { value: '20', label: '20 / halaman' },
  { value: '50', label: '50 / halaman' },
];
export const DEFAULT_PAGE_SIZE = 20;

// Label & tone badge status harian (kunci = row.tone dari attendanceReportBuilder).
export const STATUS_TONE_CLASS = {
  hadir: 'hadir',
  telat: 'telat',
  sakit: 'sakit',
  izin: 'izin',
  leave: 'izin',
  menunggu: 'telat',
  ditolak: 'alpha',
  alpha: 'alpha',
  belum: 'belum',
};
