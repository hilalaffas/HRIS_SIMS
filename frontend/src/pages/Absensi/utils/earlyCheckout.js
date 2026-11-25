// src/pages/Absensi/utils/earlyCheckout.js
//
// [UBAH] Konstanta & format alasan "Pulang Cepat". Penentuan KAPAN pulang cepat
// ada di utils/workEndCheckout.js (check-out sebelum jam pulang terjadwal);
// penegakan sebenarnya di backend (AttendanceService.submit()), dengan jam server.
import { ATTENDANCE_NOTE_MAX_LENGTH } from '../hooks/useAttendanceCapture';

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
