// src/services/roleService.js
// Mengambil daftar role dari backend (GET /api/roles), supaya dropdown
// "Hak Akses Role" di form karyawan selalu sinkron dengan role yang
// sesungguhnya ada di database (bukan daftar yang di-hardcode di frontend).
import { api } from './api';

export const getAllRoles = async () => {
  return api.get('/api/roles');
};
