// src/services/jadwalService.js
// GET  /api/jadwal?year=&month=  -> [{ employeeId, date: "YYYY-MM-DD", shiftId|null }]
// POST /api/jadwal/publish       -> body { entries: [{ employeeId, date, shiftId|null }] }
//                                   -> { created, updated }
// shiftId null = OFF / LIBUR. month: 1-12.
import { api } from './api';

export const getJadwalByMonth = async (year, month, config = {}) => {
  const numericYear = Number(year);
  const numericMonth = Number(month);
  if (!Number.isInteger(numericYear) || !Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12) {
    throw new Error('Periode jadwal tidak valid. Pilih bulan dan tahun terlebih dahulu.');
  }
  const query = new URLSearchParams({ year: String(numericYear), month: String(numericMonth) });
  return api.get(`/api/jadwal?${query.toString()}`, config);
};

export const publishJadwal = async (entries) => {
  return api.post('/api/jadwal/publish', { entries });
};

export const resetJadwal = async ({ year, month, employeeIds }) => {
  return api.post('/api/jadwal/reset', { year, month, employeeIds });
};
