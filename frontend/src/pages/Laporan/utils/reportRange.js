// src/pages/Laporan/utils/reportRange.js
//
// [BARU] Menentukan rentang tanggal laporan dari mode yang dipilih HRD:
//   PERIOD -> satu periode tutup buku (21 s/d 20)
//   TODAY  -> hari ini saja
//   CUSTOM -> tanggal bebas (Dari - Sampai), maksimal 62 hari dan tidak melewati hari ini
// Semua tanggal berupa kunci lokal 'YYYY-MM-DD' (tanpa konversi UTC).
// Fungsi murni (tanpa React) supaya mudah dites.
//
// Contoh pemakaian:
// const range = resolveReportRange({ mode: 'TODAY', period, customRange });
// // -> { mode, from, to, label, fileKey, isSingleDay }
import { parseLocalDate } from '../../../services/attendanceService';
import { dateKey, formatPeriodLabel } from '../../Absensi/utils/monthlyAttendance';
import { DEFAULT_CUSTOM_RANGE_DAYS, MAX_CUSTOM_RANGE_DAYS, RANGE_MODES } from '../config/laporanConfig';
import { getReportDateRange } from './attendanceReportBuilder';

export const getTodayKey = (now = new Date()) => dateKey(now);

export function shiftDateKey(key, days) {
  const date = parseLocalDate(key);
  return dateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

// "2 Nov 2026"
export const formatShortDay = (key) => parseLocalDate(key)
  .toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

// "Senin, 2 November 2026"
export const formatLongDay = (key) => parseLocalDate(key)
  .toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// Rentang awal "Pilih Tanggal": 7 hari terakhir sampai hari ini.
export function createDefaultCustomRange(now = new Date()) {
  const to = getTodayKey(now);
  return { from: shiftDateKey(to, -(DEFAULT_CUSTOM_RANGE_DAYS - 1)), to };
}

// Batas atas "Sampai": hari ini, dan paling jauh MAX hari setelah "Dari".
export function getCustomMaxEnd(from, now = new Date()) {
  const today = getTodayKey(now);
  const limit = shiftDateKey(from, MAX_CUSTOM_RANGE_DAYS);
  return limit < today ? limit : today;
}

// Saat "Dari" diganti: "Sampai" dipertahankan bila masih sah, kalau tidak ikut "Dari".
export function applyCustomFrom(range, from, now = new Date()) {
  const isStillValid = range.to >= from && range.to <= getCustomMaxEnd(from, now);
  return { from, to: isStillValid ? range.to : from };
}

// label    -> teks untuk modal & subtitle ekspor ("Periode: <label>")
// fileKey  -> bagian nama file ekspor
export function resolveReportRange({ mode, period, customRange, now = new Date() }) {
  if (mode === RANGE_MODES.TODAY) {
    const key = getTodayKey(now);
    return { mode, from: key, to: key, label: `${formatShortDay(key)} (Hari Ini)`, fileKey: key, isSingleDay: true };
  }

  if (mode === RANGE_MODES.CUSTOM) {
    const { from, to } = customRange;
    const isSingleDay = from === to;
    return {
      mode,
      from,
      to,
      label: isSingleDay ? formatShortDay(from) : `${formatShortDay(from)} - ${formatShortDay(to)}`,
      fileKey: isSingleDay ? from : `${from}_${to}`,
      isSingleDay,
    };
  }

  const { from, to } = getReportDateRange(period);
  return {
    mode,
    from,
    to,
    label: formatPeriodLabel(period.year, period.month),
    fileKey: `${period.year}-${String(period.month + 1).padStart(2, '0')}`,
    isSingleDay: false,
  };
}
