// src/services/divisiService.js
// Ditaruh satu folder dengan authService.js, bukan di dalam src/pages/Karyawan/,
// supaya konsisten -- semua service HTTP dikumpulkan di src/services/.
//
// Sesuai Swagger backend: GET /api/divisi -> [{ id: number, namaDivisi: string }]
//
// ASUMSI (perlu dikonfirmasi ke backend, belum kelihatan di Swagger screenshot):
// - POST   /api/divisi        body: { namaDivisi: string }
// - PUT    /api/divisi/{id}   body: { namaDivisi: string }
// - DELETE /api/divisi/{id}
// Kalau ternyata path/nama field beda, cukup ubah di file ini saja.
import { api } from './api';

export const getAllDivisi = async () => {
  return api.get('/api/divisi');
};

export const createDivisi = async (namaDivisi) => {
  return api.post('/api/divisi', { namaDivisi });
};

export const updateDivisi = async (id, namaDivisi) => {
  return api.put(`/api/divisi/${id}`, { namaDivisi });
};

export const deleteDivisi = async (id) => {
  return api.delete(`/api/divisi/${id}`);
};