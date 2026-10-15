// src/pages/Absensi/utils/earlyCheckout.js
//
// [BARU] Aturan "Pulang Cepat": check-out sebelum durasi kerja mencapai
// MIN_WORK_HOURS jam wajib disertai alasan. Pengecekan di sini hanya untuk
// MEMUNCULKAN popup peringatan (UX) -- penegakan aturan yang sebenarnya ada
// di backend (AttendanceService.submit()), dengan jam server.
import { ATTENDANCE_NOTE_MAX_LENGTH } from '../hooks/useAttendanceCapture';

export const MIN_WORK_HOURS = 8;
const MIN_WORK_MINUTES = MIN_WORK_HOURS * 60;

// Alasan disimpan di kolom `note` check-out dengan awalan ini, supaya HR bisa
// mengenalinya di tabel riwayat. Sisa panjang = batas kolom DB (255) - awalan.
export const EARLY_CHECKOUT_PREFIX = 'Pulang cepat: ';
export const EARLY_REASON_MAX_LENGTH = ATTENDANCE_NOTE_MAX_LENGTH - EARLY_CHECKOUT_PREFIX.length;

export const buildEarlyCheckoutNote = (reason) => `${EARLY_CHECKOUT_PREFIX}${reason.trim()}`;

// Jam server dicatat tanpa zona (LocalDateTime, WIB) lalu di-parse sebagai
// jam lokal browser (lihat parseNaiveDateTime). Supaya sebanding, "sekarang"
// juga dibaca sebagai jam dinding WIB, bukan zona waktu perangkat.
function getJakartaWallClock(now) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'));
}

// checkInAt = Date jam Masuk hari ini (record.recordedAt). Tidak diketahui -> false
// (tidak memblokir; backend tetap memeriksa).
export function isEarlyCheckout(checkInAt, now = new Date()) {
  if (!checkInAt) return false;
  const workedMinutes = (getJakartaWallClock(now).getTime() - checkInAt.getTime()) / 60000;
  return workedMinutes < MIN_WORK_MINUTES;
}
