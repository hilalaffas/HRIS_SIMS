// src/services/relationshipService.js
// Mengambil daftar hubungan kontak darurat dari backend
// (GET /api/emergency-contact-relationships), supaya pilihan di form SELALU
// sinkron dengan id asli di database. Sebelumnya id ini di-hardcode manual
// di FormKaryawan.jsx & ModalDetailKaryawan.jsx dan TIDAK cocok dengan data
// asli, jadi field "Hubungan" berisiko tersimpan salah tanpa disadari.
import { api } from './api';

export const getAllRelationships = async () => {
  return api.get('/api/emergency-contact-relationships');
};
