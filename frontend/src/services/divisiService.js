// src/services/divisiService.js
// Ditaruh satu folder dengan authService.js, bukan di dalam src/pages/Karyawan/,
// supaya konsisten -- semua service HTTP dikumpulkan di src/services/.
//
// Sesuai Swagger backend: GET /api/divisi -> [{ id: number, namaDivisi: string }]
//
// ASUMSI (perlu dikonfirmasi ke backend, belum kelihatan di Swagger screenshot):
// - POST   /api/divisi        body: { namaDivisi: string }
// - PUT    /api/divisi/{id}   body: { namaDivisi: string }
// - DELETE /api/divisi/{id}
// Kalau ternyata path/nama field beda, cukup ubah di file ini saja.
import { api } from './api';

export const getAllDivisi = async () => {
  return api.get('/api/divisi');
};

// [UBAH] Tambah parameter tipeDivisi: 'REGULAR' | 'SHIFTING' (default REGULAR).
// GET /api/divisi sekarang mengembalikan [{ id, namaDivisi, tipeDivisi }].
// [BARU] regularSchedule ({ startTime, endTime, dayRules }) hanya dikirim untuk divisi Regular dari form
// Kelola Divisi. Bila undefined (mis. edit nama di DataDivisi), jam kerja yang sudah tersimpan TIDAK diubah.
const regularScheduleBody = (regularSchedule) => (regularSchedule ? {
  regularStartTime: regularSchedule.startTime,
  regularEndTime: regularSchedule.endTime,
  daySchedules: regularSchedule.dayRules,
} : {});

export const createDivisi = async (namaDivisi, tipeDivisi = 'REGULAR', shifts = [], regularSchedule = undefined) => {
  return api.post('/api/divisi', { namaDivisi, tipeDivisi, shifts, ...regularScheduleBody(regularSchedule) });
};

export const updateDivisi = async (id, namaDivisi, tipeDivisi = 'REGULAR', shifts = undefined, regularSchedule = undefined) => {
  return api.put(`/api/divisi/${id}`, { namaDivisi, tipeDivisi, ...(shifts === undefined ? {} : { shifts }), ...regularScheduleBody(regularSchedule) });
};

export const deleteDivisi = async (id) => {
  return api.delete(`/api/divisi/${id}`);
};
// [BARU] Apakah divisi karyawan yang sedang login bertipe SHIFTING?
// Dipakai halaman Pengajuan untuk menampilkan kartu "Tukar Shift" hanya pada
// divisi yang punya jadwal shift. Gagal memuat = dianggap BUKAN divisi shift.
export const isMyDivisionShifting = async () => {
  try {
    const [profile, divisions] = await Promise.all([
      api.get('/api/profile/me', { silent: true }),
      api.get('/api/divisi', { silent: true }),
    ]);
    const myDivision = (divisions || []).find((division) => division.namaDivisi === profile?.divisi);
    return String(myDivision?.tipeDivisi || '').toUpperCase() === 'SHIFTING';
  } catch {
    return false;
  }
};
