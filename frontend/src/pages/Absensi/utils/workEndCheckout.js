// src/pages/Absensi/utils/workEndCheckout.js
//
// [BARU] Aturan "Pulang Cepat": check-out SEBELUM jam pulang terjadwal (mis. 16:59 untuk jam pulang
// 17:00) wajib disertai alasan. Tidak bergantung pada jam absen masuk -- masuk lebih pagi dari jam
// kerja tidak membuat karyawan boleh pulang lebih awal. Hanya untuk memunculkan popup (UX);
// penegakan sebenarnya ada di backend (AttendanceService.submit()), dengan jam server.
import { jakartaWallClock } from './activeWorkShift.js';

// workEndAt = Date jam pulang terjadwal (shiftContext.endsAt, jam dinding WIB). Tidak diketahui
// -> false (tidak memblokir; backend tetap memeriksa).
export function isBeforeWorkEnd(workEndAt, now = new Date()) {
  if (!(workEndAt instanceof Date) || !Number.isFinite(workEndAt.getTime())) return false;
  return jakartaWallClock(now).getTime() < workEndAt.getTime();
}
