// File: src/config/leaveReportExportConfig.js
//
// [BARU] Konfigurasi ekspor untuk laporan yang dulu menjadi tab di halaman Manajemen Karyawan
// (Ringkasan Cuti, Histori Cuti, Log Sistem). Sekarang Ringkasan Cuti & Histori Cuti ada di
// halaman Laporan, dan Log Sistem punya halaman sendiri.
//
// Bentuk tiap entri (dipakai hooks/useExportAction.js):
//   formats        -> kunci format yang tersedia, urutan = urutan tombol ('csv' | 'xlsx')
//   buildRows      -> (context) => baris CSV            (format 'csv')
//   headers        -> judul kolom CSV
//   xlsx           -> { buildBlob(context), buildFileName(context) }   (format 'xlsx')
//   emptyMessage   -> pesan toast bila tidak ada data
import { exportLeaveLedgerXlsx } from '../services/leaveLedgerService';
import { getTodayStamp } from '../utils/csvFile';

// Nama dasar file ledger -- sama dengan file export panel /devAccess.
const LEDGER_FILE_BASE = 'インドネシア有給管理台帳';

// Tanggal ISO (yyyy-MM-dd) -> dd/MM/yyyy untuk kolom Tanggal Masuk.
const formatJoinDate = (value) => {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
};

// Angka murni (tanpa tanda '+') supaya tidak dianggap rumus oleh Excel (lihat csvExport.js).
const toPlainNumber = (value) => Number(Number(value ?? 0).toFixed(2));

// Mengekspor baris yang SEDANG tampil di tabel (sudah terkena pencarian, filter tanggal, urutan).
// Baris dilaporkan LeaveSummaryTable lewat context.summaryRows.
export const LEAVE_SUMMARY_EXPORT = {
  formats: ['csv'],
  fileNamePrefix: 'Ringkasan_Cuti_Karyawan',
  emptyMessage: 'Tidak ada data ringkasan cuti untuk diekspor.',
  headers: [
    'NIK Karyawan',
    'Nama Karyawan',
    'Divisi',
    'Tanggal Masuk',
    'Total Keseluruhan (Hari)',
    'Terpakai (Hari)',
    'Hangus (Hari)',
    'Total Tersedia (Hari)',
    'Sisa Cuti Lama (Hari)',
    'Sisa Cuti Berjalan (Hari)',
    'Selisih Data',
  ],
  buildRows: ({ summaryRows }) =>
    summaryRows.map((row) => {
      // Selisih hanya bermakna bila statusnya OK / TIDAK_SESUAI (sama dengan tampilan tabel)
      const isComparable = row.reconcileStatus === 'OK' || row.reconcileStatus === 'TIDAK_SESUAI';
      return [
        row.nik,
        row.employeeName,
        row.divisionName,
        formatJoinDate(row.joinDate),
        toPlainNumber(row.totalOverallLeave),
        toPlainNumber(row.usedLeave),
        toPlainNumber(row.forfeitedLeave),
        toPlainNumber(row.totalAvailableLeave),
        toPlainNumber(row.remainingPreviousLeave),
        toPlainNumber(row.remainingCurrentLeave),
        isComparable ? toPlainNumber(row.reconcileDifference) : '-',
      ];
    }),
};

// File Excel format ledger dibuat backend (GET /api/cuti/ledger/export-xlsx). Periode & kata kunci
// pencarian diambil dari filter yang sedang aktif di tabel (context.ledgerParams, dilaporkan
// LeaveLedgerTable).
export const LEAVE_LEDGER_EXPORT = {
  formats: ['xlsx'],
  xlsx: {
    buildBlob: ({ ledgerParams }) => exportLeaveLedgerXlsx(ledgerParams),
    buildFileName: ({ ledgerParams }) => {
      const { from, to } = ledgerParams;
      const period = from || to ? `${from || 'awal'}_${to || 'akhir'}` : getTodayStamp();
      return `${LEDGER_FILE_BASE}_${period}.xlsx`;
    },
  },
};

export const SYSTEM_LOG_EXPORT = {
  formats: ['csv'],
  fileNamePrefix: 'Log_Sistem',
  emptyMessage: 'Tidak ada log sistem untuk diekspor.',
  headers: ['Tanggal', 'Jam', 'Aktor', 'Aktivitas'],
  buildRows: ({ logList }) => logList.map((log) => [log.tanggal, log.jam, log.aktor, log.aksi]),
};
