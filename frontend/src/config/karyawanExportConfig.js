// File: src/config/karyawanExportConfig.js
// Konfigurasi ekspor CSV per tab menu di halaman Manajemen Karyawan.
// Key HARUS sama persis dengan nama tab di TabMenuKaryawan.jsx.
// Tab baru = cukup tambah satu entri di sini, tanpa menyentuh komponen lain.

import { getAllDivisi } from '../services/divisiService';
import { buildLeavePivot } from '../utils/leavePivot';

const LEAVE_STATUS_LABEL = {
  PROSES: 'Proses',
  DISETUJUI: 'Disetujui',
  DIKEMBALIKAN: 'Dikembalikan',
  DITOLAK: 'Ditolak',
};

// Format ekspor yang tersedia untuk sebuah tab (CSV selalu ada, PDF opsional).
export const getExportFormats = (tabName) => {
  const exportConfig = KARYAWAN_EXPORT_CONFIG[tabName];
  if (!exportConfig) return [];
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

  'Data Divisi': {
    fileNamePrefix: 'Data_Divisi',
    emptyMessage: 'Tidak ada data divisi untuk diekspor.',
    headers: ['No', 'Nama Divisi', 'Jumlah Karyawan'],
    // Async: daftar divisi diambil langsung dari backend (state-nya ada di DataDivisi.jsx)
    buildRows: async ({ karyawanList }) => {
      const divisiList = (await getAllDivisi()) || [];
      return divisiList.map((divisi, index) => [
        index + 1,
        divisi.namaDivisi,
        karyawanList.filter((emp) => emp.divisi?.namaDivisi === divisi.namaDivisi).length,
      ]);
    },
    // PDF tabel biasa: memakai headers & buildRows di atas (tidak perlu buildPivot).
    pdf: {
      title: 'Data Divisi',
      fileNamePrefix: 'Data_Divisi',
      rightAlignedColumns: [2], // kolom "Jumlah Karyawan"
    },
  },

  'Log Sistem': {
    fileNamePrefix: 'Log_Sistem',
    emptyMessage: 'Tidak ada log sistem untuk diekspor.',
    headers: ['Tanggal', 'Jam', 'Aktor', 'Aktivitas'],
    buildRows: ({ logList }) => logList.map((log) => [log.tanggal, log.jam, log.aktor, log.aksi]),
  },
};
