// src/services/devToolsService.js
//
// [BARU] Alat bantu akun dev (panel /devAccess). Semua endpoint di sini hanya
// bisa dipakai akun dev -- backend menolak dengan 403 untuk akun lain.
//
// GET    /api/dev/attendance/permissions?username=  -> daftar data Izin/Sakit satu karyawan
// POST   /api/dev/attendance/{id}/reset-approval    -> status persetujuan Sakit kembali "Menunggu"
// DELETE /api/dev/attendance/{id}                   -> hapus satu data Izin/Sakit
import { api } from './api';

export const getPermissionRecords = (username) =>
  api.get(`/api/dev/attendance/permissions?username=${encodeURIComponent(username)}`);

export const resetSickApproval = (attendanceId) =>
  api.post(`/api/dev/attendance/${attendanceId}/reset-approval`, {});

export const deletePermissionRecord = (attendanceId) =>
  api.delete(`/api/dev/attendance/${attendanceId}`);
