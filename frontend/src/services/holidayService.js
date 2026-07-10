// src/services/holidayService.js
import { api } from './api';

/**
 * Menggantikan holidayService.js lama (yang fetch ke dayoffapi.vercel.app)
 * DAN holidayCustomService.js (yang simpan hari libur custom di localStorage).
 * Backend sekarang hanya punya SATU tabel `holidays` dengan flag `isNational`,
 * jadi tidak perlu lagi digabung dari 2 sumber berbeda.
 *
 * HolidayResponse dari backend: { holidayId, name, date, description, isNational, createdBy, createdAt }
 * HolidayRequest ke backend:    { name, date, description, isNational }
 */

/**
 * Ambil semua hari libur pada bulan tertentu.
 * month: 1-12 (LocalDate Java 1-indexed, BUKAN 0-indexed seperti Date.getMonth() di JS)
 */
export async function getHolidaysByMonth(year, month) {
  return api.get(`/api/holidays/month?year=${year}&month=${month}`);
}

/**
 * Ambil semua hari libur (dipakai kalau butuh data satu tahun penuh sekaligus).
 */
export async function getAllHolidays() {
  return api.get('/api/holidays');
}

/**
 * Tambah hari libur baru.
 * payload: { tanggal: 'YYYY-MM-DD', nama, description?, isNational }
 */
export async function addHoliday({ tanggal, nama, description, isNational }) {
  return api.post('/api/holidays', {
    name: nama,
    date: tanggal,
    description: description || null,
    isNational: !!isNational,
  });
}

/**
 * Ubah hari libur yang sudah ada.
 * id: holidayId
 * payload: { tanggal: 'YYYY-MM-DD', nama, description?, isNational }
 */
export async function updateHoliday(id, { tanggal, nama, description, isNational }) {
  return api.put(`/api/holidays/${id}`, {
    name: nama,
    date: tanggal,
    description: description || null,
    isNational: !!isNational,
  });
}

/**
 * Hapus hari libur berdasarkan id.
 */
export async function deleteHoliday(id) {
  return api.delete(`/api/holidays/${id}`);
}