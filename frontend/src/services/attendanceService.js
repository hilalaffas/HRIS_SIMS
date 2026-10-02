// src/services/attendanceService.js
//
// Lapisan service untuk modul Absensi, dipanggil dari pages/Absensi/absensi.jsx
// dan components/AttendanceHistoryTable.jsx. Mengikuti pola
// services/CutiService.js + services/karyawanService.js: request JSON biasa
// lewat `api.get`, dan request multipart (ada file foto) lewat `api.postForm`
// supaya body-nya TIDAK ikut di-JSON.stringify oleh services/api.js.
//
// Backend mengirim data MENTAH: `recordedAt` adalah LocalDateTime tanpa zona
// (mis. "2026-09-28T08:01:23") -- itu APA ADANYA jam yang dicatat server saat
// absen, jadi field ini SENGAJA di-parse manual per-komponen (bukan
// `new Date(iso)` langsung), supaya tidak ada re-interpretasi zona waktu oleh
// browser yang bisa menggeser jamnya. Lihat parseNaiveDateTime().
import { api } from './api';

export async function getMyAttendanceHistory() {
  return api.get('/api/absensi/me');
}

// [BARU] Persetujuan Sakit (SuperAdmin): daftar pengajuan & keputusan.
// status: 'APPROVED' | 'REJECTED'
export async function getSickApprovals() {
  return api.get('/api/absensi/approvals/sakit');
}

export async function decideSickApproval(attendanceId, status) {
  return api.put(`/api/absensi/${attendanceId}/approval`, { status });
}

// POST catat absensi. `photoBlob` WAJIB, `latitude`/`longitude` WAJIB --
// backend menolak tanpa GPS/foto (lihat AttendanceService.submit()).
export async function submitAttendance({ action, reason, note, latitude, longitude, photoBlob }) {
  const formData = new FormData();
  formData.append('action', action);
  formData.append('reason', reason);
  if (note) formData.append('note', note);
  formData.append('latitude', latitude);
  formData.append('longitude', longitude);
  formData.append('photo', photoBlob, 'absensi.jpg');
  return api.postForm('/api/absensi/me', formData);
}

// Konversi data:/blob: URL (hasil canvas.toDataURL() saat jepret kamera, atau
// URL.createObjectURL() saat fallback unggah file) jadi Blob untuk FormData.
export async function dataUrlToBlob(url) {
  const response = await fetch(url);
  return response.blob();
}

export const toActionCode = (label) => (label === 'Keluar' ? 'KELUAR' : 'MASUK');
export const toReasonCode = (label) => ({ Absen: 'ABSEN', Sakit: 'SAKIT', Izin: 'IZIN' }[label] || 'ABSEN');

const ACTION_LABELS = { MASUK: 'Masuk', KELUAR: 'Keluar' };
export const actionLabel = (code) => ACTION_LABELS[String(code || '').toUpperCase()] || code || '-';

const REASON_LABELS = { ABSEN: 'Absen', SAKIT: 'Sakit', IZIN: 'Izin' };
export const reasonLabel = (code) => REASON_LABELS[String(code || '').toUpperCase()] || code || '-';

// [BARU] Parse "2026-09-28T08:01:23(.xxx)?" per-komponen (tahun/bulan/.../detik)
// jadi Date lokal browser dengan ANGKA YANG SAMA PERSIS -- BUKAN `new Date(iso)`
// yang bisa salah baca zona waktu. Dipakai untuk semua perhitungan (durasi,
// lembur, pengelompokan per hari) supaya konsisten dengan jam yang tersimpan
// di database, apa pun zona waktu server/browser-nya.
export function parseNaiveDateTime(iso) {
  if (!iso) return null;
  const [datePart, timePart = '00:00:00'] = iso.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, secondRaw] = timePart.split(':');
  const second = secondRaw ? parseInt(secondRaw, 10) : 0;
  return new Date(year, month - 1, day, Number(hour), Number(minute), second || 0);
}

// "2026-09-28" -> Date lokal jam 00:00 (untuk cek hari kerja/weekend, urutan
// tanggal, dst). Backend mengirim `attendanceDate` dalam format ini (LocalDate).
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateLabel(dateStr) {
  const date = parseLocalDate(dateStr);
  return date ? date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
}

export function formatTimeLabel(date) {
  if (!date) return '-';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} WIB`;
}

// "1 jam 20 menit" dari jumlah menit -- dipakai kolom "Durasi kerja" & "Lembur".
export function formatDurationMinutes(totalMinutes) {
  if (totalMinutes == null || totalMinutes <= 0) return null;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours === 0) return `${minutes} menit`;
  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} menit`;
}

// [BARU] Satu AttendanceResponse (per event Masuk/Keluar dari backend) diubah
// jadi bentuk siap-tampil, dipakai AttendanceHistoryTable untuk membangun
// baris gabungan per hari (lihat groupRecordsByDay di file yang sama).
export function toDisplayRecord(item) {
  const recordedAt = parseNaiveDateTime(item.recordedAt);
  return {
    id: item.attendanceId,
    action: actionLabel(item.action),
    actionCode: String(item.action || '').toUpperCase(),
    reason: reasonLabel(item.reason),
    reasonCode: String(item.reason || '').toUpperCase(),
    statusCode: String(item.status || '').toUpperCase(),
    isLate: String(item.status).toUpperCase() === 'LATE',
    note: item.note || '',
    photoUrl: item.photoUrl || '',
    latitude: item.latitude,
    longitude: item.longitude,
    mapsUrl: item.mapsUrl || null,
    attendanceDate: item.attendanceDate,
    approvalStatus: String(item.approvalStatus || '').toUpperCase(), // [BARU]
    recordedAt,
    time: formatTimeLabel(recordedAt),
  };
}
