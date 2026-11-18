// File: src/utils/excelValueConverters.js
// [BARU] Pengubah nilai mentah -> tipe asli sel Excel (tanggal, jam, durasi, angka, mata uang).
// Fungsi murni tanpa import, jadi mudah dites dan dipakai ulang oleh ekspor mana pun.
//
// Cara kerja tipe waktu di Excel: jam & durasi disimpan sebagai pecahan hari
// (08:00 = 8/24 = 0,3333...) lalu ditampilkan lewat format sel. Nilainya tetap ANGKA,
// jadi bisa dijumlah, diurutkan, dan dipakai rumus.
//
// Contoh pemakaian:
//   toExcelDate('2026-10-21');        // Date 2026-10-21T00:00:00Z  (format yyyy-mm-dd)
//   toExcelTime('08:30:15');          // 0.35434...                 (format hh:mm:ss)
//   toExcelDuration(570);             // 0.39583...                 (format [h]:mm -> 9:30)

export const EXCEL_FORMATS = {
  date: 'yyyy-mm-dd',
  time: 'hh:mm',
  timeSeconds: 'hh:mm:ss',
  duration: '[h]:mm', // [h] = jam boleh lebih dari 24
  integer: '0',
  decimal: '0.0',
  hours: '0.00" jam"',
  currency: '"Rp" #,##0', // dipakai bila nanti ada kolom nominal uang
  text: '@',
};

const SECONDS_PER_DAY = 24 * 60 * 60;
const MINUTES_PER_DAY = 24 * 60;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const CLOCK_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

// "2026-10-21" -> Date UTC tengah malam. Library Excel membaca Date sebagai UTC, jadi
// tanggal TIDAK bergeser sehari walau browser berada di zona WIB (UTC+7).
export const toExcelDate = (dateKey) => {
  const match = DATE_KEY_PATTERN.exec(String(dateKey ?? ''));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
};

// "08:30" / "08:30:15" -> pecahan hari. Format tidak valid ("-", null) -> null (sel kosong).
export const toExcelTime = (clock) => {
  const match = CLOCK_PATTERN.exec(String(clock ?? '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0); // detik opsional: "08:30" dan "08:30:15" sama-sama valid
  return (hours * 3600 + minutes * 60 + seconds) / SECONDS_PER_DAY;
};

// Menit -> pecahan hari untuk format durasi [h]:mm. Nol/negatif/bukan angka -> null.
export const toExcelDuration = (totalMinutes) => {
  const minutes = Number(totalMinutes);
  return Number.isFinite(minutes) && minutes > 0 ? minutes / MINUTES_PER_DAY : null;
};

// Angka murni; nilai kosong atau bukan angka -> null (sel kosong, bukan teks "-").
export const toExcelNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
