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
 * Ubah hari libur custom yang sudah ada.
 * id: id hari libur yang mau diubah
 * payload: { tanggal: 'YYYY-MM-DD', nama: string }
 */
export async function updateCustomHoliday(id, payload) {
  const all = readAll();
  const idx = all.findIndex((item) => item.id === id);
  if (idx === -1) {
    throw new Error('Hari libur tidak ditemukan.');
  }

  const updated = {
    ...all[idx],
    tanggal: payload.tanggal,
    nama: payload.nama,
  };

  all[idx] = updated;
  writeAll(all);
  return updated;
}

/**
 * Hapus hari libur custom berdasarkan id.
 */
export async function deleteCustomHoliday(id) {
  const all = readAll();
  const filtered = all.filter((item) => item.id !== id);
  writeAll(filtered);
  return true;
}

/**
 * Ambil semua hari libur custom untuk tahun tertentu,
 * dalam format { "YYYY-MM-DD": "Nama Libur" } — sama seperti
 * format yang dipakai holidayService.getHolidaysByYear, supaya
 * gampang digabung di CalendarCard.
 *
 * (Dipertahankan untuk kompatibilitas; CalendarCard versi baru
 * memakai getCustomHolidaysRawByYear supaya id & sumber datanya ikut terbawa.)
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

/**
 * Ambil semua hari libur custom untuk tahun tertentu dalam bentuk array mentah
 * (lengkap dengan id), supaya komponen pemanggil bisa tahu item mana yang
 * boleh di-Edit/Hapus dan id apa yang harus dipakai.
 * Return: [{ id, tanggal: 'YYYY-MM-DD', nama }]
 */
export async function getCustomHolidaysRawByYear(year) {
  const all = readAll();
  return all.filter((item) => item.tanggal?.startsWith(String(year)));
}