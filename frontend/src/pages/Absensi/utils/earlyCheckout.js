// src/pages/Absensi/utils/earlyCheckout.js
//
// [BARU] Aturan "Pulang Cepat": check-out sebelum durasi kerja mencapai
// MIN_WORK_HOURS jam wajib disertai alasan. Pengecekan di sini hanya untuk
// MEMUNCULKAN popup peringatan (UX) -- penegakan aturan yang sebenarnya ada
// di backend (AttendanceService.submit()), dengan jam server.
import { ATTENDANCE_NOTE_MAX_LENGTH } from '../hooks/useAttendanceCapture';

export const MIN_WORK_HOURS = 8;

// Alasan disimpan di kolom `note` check-out dengan awalan ini, supaya HR bisa
// mengenalinya di tabel riwayat. Sisa panjang = batas kolom DB (255) - awalan.
export const EARLY_CHECKOUT_PREFIX = 'Pulang cepat: ';
export const EARLY_REASON_MAX_LENGTH = ATTENDANCE_NOTE_MAX_LENGTH - EARLY_CHECKOUT_PREFIX.length;

export const buildEarlyCheckoutNote = (reason) => `${EARLY_CHECKOUT_PREFIX}${reason.trim()}`;

// Jam server dicatat tanpa zona (LocalDateTime, WIB) lalu di-parse sebagai
// jam lokal browser (lihat parseNaiveDateTime). Supaya sebanding, "sekarang"
// juga dibaca sebagai jam dinding WIB, bukan zona waktu perangkat.
// [UBAH] di-export: dipakai juga utils/overtimeCheckout.js (cek "setelah jam pulang 17:00").
export { jakartaWallClock as getJakartaWallClock } from './activeWorkShift';
import { jakartaWallClock as getJakartaWallClock } from './activeWorkShift';

// checkInAt = Date jam Masuk hari ini (record.recordedAt). Tidak diketahui -> false
// (tidak memblokir; backend tetap memeriksa).
export function isEarlyCheckout(checkInAt, now = new Date(), requiredWorkHours = MIN_WORK_HOURS) {
  if (!checkInAt) return false;
  const workedMinutes = (getJakartaWallClock(now).getTime() - checkInAt.getTime()) / 60000;
  return workedMinutes < (Number(requiredWorkHours) || MIN_WORK_HOURS) * 60;
}
