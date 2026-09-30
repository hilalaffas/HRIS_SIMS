// src/services/jadwalService.js
// GET  /api/jadwal?year=&month=  -> [{ employeeId, date: "YYYY-MM-DD", shiftId|null }]
// POST /api/jadwal/publish       -> body { entries: [{ employeeId, date, shiftId|null }] }
//                                   -> { created, updated }
// shiftId null = OFF / LIBUR. month: 1-12.
import { api } from './api';

export const getJadwalByMonth = async (year, month, config = {}) => {
  return api.get(`/api/jadwal?year=${year}&month=${month}`, config);
};

export const publishJadwal = async (entries) => {
  return api.post('/api/jadwal/publish', { entries });
};
