// src/utils/holidayMap.js
//
// [BARU] Peta tanggal libur ('YYYY-MM-DD' -> nama) yang dipakai tabel absensi, laporan, dan date picker.
//
// AKAR MASALAH "Jumat tanpa libur tampil Libur": sebelumnya peta dimulai dari LOCAL_HOLIDAYS_2026 lalu
// data API hanya DITAMBAHKAN di atasnya. Tanggal yang salah di file lokal (mis. 2026-09-25) tidak pernah
// bisa dihapus oleh API, jadi selalu tampil sebagai libur walau database tidak memilikinya.
// Sekarang API adalah sumber utama; data lokal hanya menggantikan bulan yang GAGAL dimuat.
import { LOCAL_HOLIDAYS_2026 } from '../constants/holidays';
import { getHolidaysByMonth } from '../services/holidayService';

const pad = (value) => String(value).padStart(2, '0');
const monthPrefix = (year, month) => `${year}-${pad(month)}-`; // month 1-12
const toList = (result) => (Array.isArray(result) ? result : result?.data || []);
const holidayName = (holiday) => holiday.name || holiday.nama || 'Libur Nasional';

// monthResults: [{ year, month (1-12), holidays: array | null }] -- null = pemuatan bulan itu gagal.
export function buildHolidayMap(monthResults, fallback = LOCAL_HOLIDAYS_2026) {
  const map = {};
  monthResults.forEach(({ year, month, holidays }) => {
    if (holidays == null) {
      const prefix = monthPrefix(year, month);
      Object.entries(fallback).forEach(([date, name]) => { if (date.startsWith(prefix)) map[date] = name; });
      return;
    }
    holidays.forEach((holiday) => { if (holiday?.date) map[holiday.date] = holidayName(holiday); });
  });
  return map;
}

// Ganti isi SATU bulan pada peta yang sudah ada (dipakai date picker saat pindah bulan).
export function replaceMonthHolidays(current, year, month, holidays) {
  const prefix = monthPrefix(year, month);
  const next = Object.fromEntries(Object.entries(current).filter(([date]) => !date.startsWith(prefix)));
  holidays.forEach((holiday) => { if (holiday?.date) next[holiday.date] = holidayName(holiday); });
  return next;
}

// months: [{ year, month (1-12) }]
export async function loadHolidayMap(months) {
  const monthResults = await Promise.all(months.map(async ({ year, month }) => {
    try {
      return { year, month, holidays: toList(await getHolidaysByMonth(year, month, { silent: true })) };
    } catch {
      return { year, month, holidays: null };
    }
  }));
  return buildHolidayMap(monthResults);
}

export { toList as toHolidayList };
