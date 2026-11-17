// src/pages/LogSistem/utils/formatSystemLogs.js
//
// [BARU] Mengubah data log mentah dari backend (GET /api/admin/logs) menjadi baris yang siap
// ditampilkan LogTable & diekspor. Dipindahkan dari Karyawan.jsx (fetchLogs).

// Hanya aksi yang mengubah data (tambah, ubah, hapus, ajukan/setujui cuti, dst) yang ditampilkan.
// Aksi "GET_..." (sekadar melihat menu/data) dibuang -- pengaman tambahan bila backend belum
// menyaringnya. Sync libur nasional otomatis oleh "System" juga dibuang.
const isDisplayableLog = (log) => {
  const action = String(log.action || '').toUpperCase();
  const isViewOnly = action.startsWith('GET_');
  const isAutoHolidaySync = log.username === 'System' && action === 'SYNC_HOLIDAY';
  return !isViewOnly && !isAutoHolidaySync;
};

const toLogRow = (log) => {
  // Memisahkan tanggal dan jam dari createdAt (LocalDateTime)
  const createdAt = new Date(log.createdAt);
  return {
    id: log.logId,
    tanggal: createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    jam: createdAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    aktor: log.username,
    aksi: log.description || log.action,
    type: 'normal',
  };
};

export const formatSystemLogs = (rawLogs) => (rawLogs || []).filter(isDisplayableLog).map(toLogRow);
