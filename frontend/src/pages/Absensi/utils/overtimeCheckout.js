// src/pages/Absensi/utils/overtimeCheckout.js
//
// [BARU] Aturan & helper untuk popup "Check-Out Jam Kerja (17:00+)": check-out
// SETELAH jam pulang menanyakan apakah karyawan lembur, dan bila ya, mengisi
// form "Tambah Lembur" -- bisa berulang (looping) sampai karyawan benar-benar
// check-out. Pengecekan di sini hanya untuk MEMUNCULKAN popup (UX); jam mulai,
// batas jam selesai, dan validasi sebenarnya ada di backend
// (OvertimeService.getExtensionWindow() / submitExtension()), dengan jam server.
import { getJakartaWallClock } from './earlyCheckout';

// Jam pulang Shift Normal (lihat SHIFT_LABEL di monthlyAttendance.js).
// Bila jadwal shift per-karyawan nanti dipakai di absensi, ganti di sini saja.
export const WORK_END_LABEL = '17:00';
const WORK_END_MINUTES = 17 * 60;

// Alasan maksimal di form. Backend menambah awalan "Tambahan saat check-out: "
// (25 karakter) pada kolom 500 karakter, jadi 450 sudah aman.
export const EXTENSION_REASON_MAX_LENGTH = 450;

// true bila SEKARANG (jam dinding WIB) sudah lewat/sama dengan jam pulang.
export function isAfterWorkEnd(now = new Date()) {
  const wall = getJakartaWallClock(now);
  return wall.getHours() * 60 + wall.getMinutes() >= WORK_END_MINUTES;
}

const pad = (value) => String(value).padStart(2, '0');

// "19:30" -> 1170 ; kosong/tidak valid -> null
export function clockToMinutes(clock) {
  if (!clock || !/^\d{1,2}:\d{2}/.test(clock)) return null;
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

// 1200 -> "20:00"
export function minutesToClock(totalMinutes) {
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}

// Teks toast setelah lembur tambahan terkirim. `saved` = respons mentah backend.
export function describeExtensionSaved(saved) {
  const start = String(saved?.startTime || '').slice(0, 5);
  const end = String(saved?.endTime || '').slice(0, 5);
  return start && end
    ? `Lembur ${start} - ${end} berhasil diajukan (menunggu persetujuan).`
    : 'Lembur tambahan berhasil diajukan (menunggu persetujuan).';
}
