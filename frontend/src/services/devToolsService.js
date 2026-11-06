// src/services/devToolsService.js
//
// [BARU] Alat bantu akun dev (panel /devAccess). Semua endpoint di sini hanya
// bisa dipakai akun dev -- backend menolak dengan 403 untuk akun lain.
//
// GET    /api/dev/attendance/permissions?username=  -> daftar data Izin/Sakit satu karyawan
// POST   /api/dev/attendance/{id}/reset-approval    -> status persetujuan Sakit kembali "Menunggu"
// DELETE /api/dev/attendance/{id}                   -> hapus satu data Izin/Sakit
//
// [BARU] Import/export karyawan, penyesuaian cuti, dan edit NIK:
// GET  /api/dev/employees                 -> daftar karyawan (panel NIK)
// GET  /api/dev/employees/export          -> CSV data karyawan (teks)
// POST /api/dev/employees/import          -> { csvText, defaultPassword } -> ringkasan + hasil per baris
// PUT  /api/dev/employees/{id}/nik        -> { nik } [UBAH] angka urut 4-6 digit (contoh 0012)
// GET  /api/dev/leave/employees           -> saldo cuti semua karyawan
// GET  /api/dev/leave/export              -> CSV saldo cuti (teks)
// POST /api/dev/leave/import              -> { csvText } -> ringkasan + hasil per baris
// PUT  /api/dev/leave/employees/{id}      -> { joinDate, oldLeaveBalance, currentYearRemaining }
//
// [BARU] Riwayat cuti format ledger (satu baris per tanggal):
// GET  /api/dev/leave-history/export      -> CSV ledger (teks); opsional ?from=&to= (tanggal selalu YYYY-MM-DD)
// POST /api/dev/leave-history/import      -> { csvText, applyRemaining } -> ringkasan + hasil per baris + notes
// [BARU] POST /api/dev/leave-history/import-xlsx -> multipart { file (.xlsx), applyRemaining, dryRun }; komentar sel = tipe cuti
// [BARU] dryRun = true (import CSV maupun Excel) -> pratinjau: diperiksa seperti import sungguhan, tidak ada yang disimpan
// [BARU] GET  /api/dev/leave-history/export-xlsx  -> file Excel; tipe cuti (selain tahunan & setengah hari) jadi komentar sel
import { api, getStoredToken, toApiUrl } from './api';

export const getPermissionRecords = (username) =>
  api.get(`/api/dev/attendance/permissions?username=${encodeURIComponent(username)}`);

export const resetSickApproval = (attendanceId) =>
  api.post(`/api/dev/attendance/${attendanceId}/reset-approval`, {});

export const deletePermissionRecord = (attendanceId) =>
  api.delete(`/api/dev/attendance/${attendanceId}`);

// ====================== [BARU] Karyawan: daftar, import, export, NIK ======================

export const getDevEmployees = () => api.get('/api/dev/employees', { silent: true });

export const exportEmployeesCsv = () => api.get('/api/dev/employees/export', { silent: true });

export const importEmployeesCsv = (csvText, defaultPassword) =>
  api.post('/api/dev/employees/import', { csvText, defaultPassword });

export const updateEmployeeNik = (employeeId, nik) =>
  api.put(`/api/dev/employees/${employeeId}/nik`, { nik });

// ====================== [BARU] Cuti: saldo, import, export, penyesuaian ======================

export const getDevLeaveRows = () => api.get('/api/dev/leave/employees', { silent: true });

export const exportLeaveCsv = () => api.get('/api/dev/leave/export', { silent: true });

export const importLeaveCsv = (csvText) => api.post('/api/dev/leave/import', { csvText });

// payload: { joinDate?, oldLeaveBalance?, currentYearRemaining? } -- field yang tidak dikirim tidak diubah.
export const updateLeaveAdjustment = (employeeId, payload) =>
  api.put(`/api/dev/leave/employees/${employeeId}`, payload);

// ====================== [BARU] Riwayat cuti (format ledger) ======================

// [UBAH] params: { from?, to? } -- from & to (yyyy-MM-dd) diisi keduanya atau tidak sama sekali.
// Parameter dateFormat dihapus: tanggal file export selalu YYYY-MM-DD.
export const exportLeaveHistoryCsv = ({ from, to } = {}) => {
  const query = new URLSearchParams();
  if (from && to) {
    query.set('from', from);
    query.set('to', to);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return api.get(`/api/dev/leave-history/export${suffix}`, { silent: true });
};

export const importLeaveHistoryCsv = (csvText, applyRemaining, dryRun = false) =>
  api.post('/api/dev/leave-history/import', { csvText, applyRemaining, dryRun });

// [BARU] Import dari file Excel (.xlsx) -- dikirim sebagai multipart agar komentar sel ikut terbaca.
export const importLeaveHistoryXlsx = (file, applyRemaining, dryRun = false) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('applyRemaining', String(Boolean(applyRemaining)));
  formData.append('dryRun', String(Boolean(dryRun)));
  return api.postForm('/api/dev/leave-history/import-xlsx', formData);
};

// [BARU] Export Excel (biner) -- api.get membaca respons sebagai teks sehingga file biner dibaca
// lewat fetch langsung dengan token yang sama. Mengembalikan Blob.
export const exportLeaveHistoryXlsx = async ({ from, to } = {}) => {
  const query = new URLSearchParams();
  if (from && to) {
    query.set('from', from);
    query.set('to', to);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const token = getStoredToken();
  const response = await fetch(toApiUrl(`/api/dev/leave-history/export-xlsx${suffix}`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let message = `Export gagal (${response.status})`;
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // respons bukan JSON; pakai pesan bawaan
    }
    throw new Error(message);
  }
  return response.blob();
};
