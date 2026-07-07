// src/services/holidayCustomService.js

/**
 * Hari libur TAMBAHAN yang di-input manual oleh HR/Admin lewat modal
 * "Jadwalkan Hari Libur". Terpisah dari src/services/holidayService.js
 * (yang berisi hari libur nasional bawaan/API pemerintah), supaya
 * keduanya bisa digabung tanpa saling menimpa.
 *
 * NANTI: ganti isi tiap fungsi dengan panggilan API.
 */

const STORAGE_KEY = 'dummy_hari_libur_custom';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Gagal membaca data hari libur custom:', err);
    return [];
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Gagal menyimpan data hari libur custom:', err);
  }
}

/**
 * Tambah 1 hari libur baru.
 * payload: { tanggal: 'YYYY-MM-DD', nama: string }
 */
export async function addCustomHoliday(payload) {
  const all = readAll();
  const newItem = {
    id: Date.now(),
    tanggal: payload.tanggal,
    nama: payload.nama,
  };
  writeAll([newItem, ...all]);
  return newItem;
}

/**
 * Ambil semua hari libur custom untuk tahun tertentu,
 * dalam format { "YYYY-MM-DD": "Nama Libur" } — sama seperti
 * format yang dipakai holidayService.getHolidaysByYear, supaya
 * gampang digabung di CalendarCard.
 */
export async function getCustomHolidaysByYear(year) {
  const all = readAll();
  const result = {};
  all.forEach((item) => {
    if (item.tanggal?.startsWith(String(year))) {
      result[item.tanggal] = item.nama;
    }
  });
  return result;
}