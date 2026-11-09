// File: src/config/karyawanExportConfig.js
// Konfigurasi ekspor CSV per tab menu di halaman Manajemen Karyawan.
// Key HARUS sama persis dengan nama tab di TabMenuKaryawan.jsx.
// Tab baru = cukup tambah satu entri di sini, tanpa menyentuh komponen lain.

import { getAllDivisi } from '../services/divisiService';
import { buildLeavePivot } from '../utils/leavePivot';
import { exportLeaveLedgerXlsx } from '../services/leaveLedgerService'; // [BARU] export Excel Histori Cuti
import { getTodayStamp } from '../utils/csvFile'; // [BARU]

// [BARU] Nama dasar file ledger -- sama dengan file export panel /devAccess.
const LEDGER_FILE_BASE = 'インドネシア有給管理台帳';

// [BARU] Tanggal ISO (yyyy-MM-dd) -> dd/MM/yyyy untuk kolom Tgl Masuk.
const formatJoinDate = (value) => {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
};

// [BARU] Angka murni (tanpa tanda '+') supaya tidak dianggap rumus oleh Excel (lihat csvExport.js).
const toPlainNumber = (value) => Number(Number(value ?? 0).toFixed(2));

const LEAVE_STATUS_LABEL = {
  PROSES: 'Proses',
  DISETUJUI: 'Disetujui',
  DIKEMBALIKAN: 'Dikembalikan',
  DITOLAK: 'Ditolak',
};

// Format ekspor yang tersedia untuk sebuah tab (CSV selalu ada, PDF opsional).
// [UBAH] Tab yang mendefinisikan `formats` sendiri (mis. Histori Cuti = Excel saja) memakai itu.
export const getExportFormats = (tabName) => {
  const exportConfig = KARYAWAN_EXPORT_CONFIG[tabName];
  if (!exportConfig) return [];
  if (exportConfig.formats) return exportConfig.formats;
  return exportConfig.pdf ? ['csv', 'pdf'] : ['csv'];
};

export const KARYAWAN_EXPORT_CONFIG = {
  'List Karyawan': {
    fileNamePrefix: 'Data_Karyawan',
    emptyMessage: 'Tidak ada data karyawan untuk diekspor.',
    headers: ['NIK Karyawan', 'Nama Lengkap', 'Posisi', 'Departemen/Divisi', 'Sisa Cuti', 'Email', 'Telepon', 'Status'],
    buildRows: ({ karyawanList }) =>
      karyawanList.map((emp) => [
        emp.nikKaryawan,
        emp.fullName,
        emp.user?.roleId?.roleName || 'MEMBER',
        emp.divisi?.namaDivisi || 'Umum',
        // Sama dengan kolom SISA CUTI di TableKaryawan.jsx
        emp.totalRemainingLeave ?? emp.manualLeaveBalance ?? 0,
        emp.user?.email || emp.email,
        emp.phoneNumber || emp.phone || emp.noTelp || emp.telepon,
        emp.isActive ? 'AKTIF' : 'NONAKTIF',
      ]),
  },

  'Cuti Karyawan': {
    fileNamePrefix: 'Data_Cuti_Karyawan',
    emptyMessage: 'Tidak ada data cuti karyawan untuk diekspor.',
    headers: [
      'NIK Karyawan',
      'Nama Karyawan',
      'Jenis Cuti',
      'Tanggal Mulai',
      'Tanggal Selesai',
      'Durasi (Hari)',
      'Sisa Cuti Setelah Pengajuan (Hari)',
      'Status Berkas',
    ],
    buildRows: ({ riwayatCuti, balanceAfterByLeaveId }) =>
      riwayatCuti.map((item) => [
        item.karyawan?.kode,
        item.karyawan?.nama,
        item.jenisCuti,
        item.startDate,
        item.endDate,
        item.totalDays,
        // Hanya cuti yang disetujui punya angka sisa -> selain itu tampil "-"
        balanceAfterByLeaveId[item.id],
        LEAVE_STATUS_LABEL[item.statusBerkas] || item.statusBerkas,
      ]),
    // Opsional: tab yang punya blok `pdf` otomatis menampilkan pilihan CSV / PDF.
    pdf: {
      title: 'Rekap Cuti Karyawan',
      fileNamePrefix: 'Rekap_Cuti_Karyawan',
      emptyMessage: 'Tidak ada data cuti karyawan untuk diekspor.',
      buildPivot: ({ riwayatCuti, balanceAfterByLeaveId }) =>
        buildLeavePivot(riwayatCuti, balanceAfterByLeaveId),
    },
  },

  // [BARU] Tab Ringkasan Cuti -- mengekspor baris yang SEDANG tampil di tabel (sudah terkena
  // pencarian, filter tanggal, dan urutan). Baris dilaporkan LeaveSummaryTable lewat summaryRows.
  'Ringkasan Cuti': {
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
  },

  // [BARU] Tab Histori Cuti -- file Excel format ledger dibuat oleh backend
  // (GET /api/cuti/ledger/export-xlsx). Periode & kata kunci pencarian diambil dari filter yang
  // sedang aktif di tabel (dilaporkan LeaveLedgerTable lewat ledgerParams).
  'Histori Cuti': {
    formats: ['xlsx'],
    xlsx: {
      buildBlob: ({ ledgerParams }) => exportLeaveLedgerXlsx(ledgerParams),
      buildFileName: ({ ledgerParams }) => {
        const { from, to } = ledgerParams;
        const period = from || to ? `${from || 'awal'}_${to || 'akhir'}` : getTodayStamp();
        return `${LEDGER_FILE_BASE}_${period}.xlsx`;
      },
    },
  },

  'Data Divisi': {
    fileNamePrefix: 'Data_Divisi',
    emptyMessage: 'Tidak ada data divisi untuk diekspor.',
    headers: ['No', 'Nama Divisi', 'Tipe Divisi', 'Jumlah Karyawan'],
    // Async: daftar divisi diambil langsung dari backend (state-nya ada di DataDivisi.jsx)
    buildRows: async ({ karyawanList }) => {
      const divisiList = (await getAllDivisi()) || [];
      return divisiList.map((divisi, index) => [
        index + 1,
        divisi.namaDivisi,
        divisi.tipeDivisi === 'SHIFTING' ? 'Non Regular (Shifting)' : 'Regular',
        karyawanList.filter((emp) => emp.divisi?.namaDivisi === divisi.namaDivisi).length,
      ]);
    },
    // PDF tabel biasa: memakai headers & buildRows di atas (tidak perlu buildPivot).
    pdf: {
      title: 'Data Divisi',
      fileNamePrefix: 'Data_Divisi',
      rightAlignedColumns: [3], // kolom "Jumlah Karyawan"
    },
  },

  'Log Sistem': {
    fileNamePrefix: 'Log_Sistem',
    emptyMessage: 'Tidak ada log sistem untuk diekspor.',
    headers: ['Tanggal', 'Jam', 'Aktor', 'Aktivitas'],
    buildRows: ({ logList }) => logList.map((log) => [log.tanggal, log.jam, log.aktor, log.aksi]),
  },
};
