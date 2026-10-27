// src/services/attendanceCorrectionService.js
//
// [BARU][DUMMY] Pengajuan koreksi keterlambatan. Backend BELUM ada, jadi fungsi
// ini hanya meniru respons server (jeda singkat lalu sukses).
//
// [BELUM] Saat backend siap, ganti isi submitCorrectionRequest dengan:
//   return api.post('/api/absensi/me/correction', { attendanceDate, reason });
// dan biarkan pemanggilnya (absensi.jsx) tidak berubah.
const FAKE_LATENCY_MS = 600;

export async function submitCorrectionRequest({ attendanceDate, reason }) {
  await new Promise((resolve) => { window.setTimeout(resolve, FAKE_LATENCY_MS); });
  return { attendanceDate, reason, status: 'PENDING' };
}
