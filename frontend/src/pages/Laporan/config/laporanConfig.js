// src/pages/Laporan/config/laporanConfig.js
//
// [BARU] Konfigurasi halaman Laporan. Tab baru cukup ditambahkan di REPORT_TABS lalu dirender
// di Laporan.jsx.
// [UBAH] Tiap tab punya daftar `roles` yang boleh melihatnya (halaman Laporan sendiri dibuka untuk
// HRD_ADMIN & SUPER_ADMIN). Laporan Absen tetap khusus HRD_ADMIN; Ringkasan Cuti
// pindahan dari halaman Manajemen Karyawan dan boleh dilihat SUPER_ADMIN seperti sebelumnya.
// [UBAH] Tab Histori Cuti dihapus (ekspor Excel ledger-nya pindah ke Ringkasan Cuti). Penjaga sebenarnya ada di backend (SecurityConfig), ini hanya mengatur tampilan.
import { ROLES, getUserRole } from '../../../utils/roles';

export const REPORT_TABS = [
  { key: 'ATTENDANCE', label: 'Laporan Absen', roles: [ROLES.HR_ADMIN] },
  { key: 'LEAVE_SUMMARY', label: 'Ringkasan Cuti', roles: [ROLES.HR_ADMIN, ROLES.SUPER_ADMIN] },
];

// Tab yang boleh dilihat user; urutan pertama = tab awal saat halaman dibuka.
export const getVisibleReportTabs = (user) => {
  const role = getUserRole(user);
  return REPORT_TABS.filter((tab) => tab.roles.includes(role));
};

// [BARU] Mode rentang laporan: per periode tutup buku (21 s/d 20), hari ini saja,
// atau tanggal bebas pilihan HRD (Dari - Sampai).
export const RANGE_MODES = { PERIOD: 'PERIOD', TODAY: 'TODAY', CUSTOM: 'CUSTOM' };
export const DEFAULT_RANGE_MODE = RANGE_MODES.PERIOD;
export const RANGE_MODE_OPTIONS = [
  { key: RANGE_MODES.PERIOD, label: 'Per Periode', hint: 'Periode tutup buku (tanggal 21 s/d 20)' },
  { key: RANGE_MODES.TODAY, label: 'Hari Ini', hint: 'Data absensi hari ini saja' },
  { key: RANGE_MODES.CUSTOM, label: 'Pilih Tanggal', hint: 'Pilih tanggal sendiri' },
];
// Batas rentang tanggal pilihan = batas backend (AttendanceReportService.MAX_RANGE_DAYS).
export const MAX_CUSTOM_RANGE_DAYS = 62;
// Rentang awal saat HRD pertama kali membuka "Pilih Tanggal": 7 hari terakhir.
export const DEFAULT_CUSTOM_RANGE_DAYS = 7;

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

// [UBAH] Opsi jumlah baris per halaman kini dari utils/pagination.js (DEFAULT_SIZE_OPTIONS:
// 5, 10, 25, 50, Semua) -- sama dengan tab Ringkasan Cuti. PAGE_SIZE_OPTIONS dihapus.
export const DEFAULT_PAGE_SIZE = 5; // tampil awal 5 karyawan (sebelumnya 20)

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
