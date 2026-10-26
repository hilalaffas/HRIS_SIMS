// src/pages/Pengajuan/data/mockShiftSwap.js
//
// DATA SEMENTARA untuk tampilan popup Tukar Shift. Backend tukar shift belum
// ada, jadi daftar jadwal & rekan di bawah hanya contoh agar UI bisa dicoba.
// TODO: ganti dengan data asli (jadwal shift karyawan + rekan satu divisi)
// begitu endpoint tukar shift tersedia, lalu hapus file ini.
export const MOCK_MY_SHIFTS = [
  { value: 'shift-1', label: 'Senin, 26 Okt 2026 — Shift Pagi (07:00–15:00)' },
  { value: 'shift-2', label: 'Rabu, 28 Okt 2026 — Shift Siang (15:00–23:00)' },
  { value: 'shift-3', label: 'Jumat, 30 Okt 2026 — Shift Malam (23:00–07:00)' },
];

export const MOCK_COLLEAGUES = [
  { value: 'colleague-1', label: 'Rekan Contoh 1' },
  { value: 'colleague-2', label: 'Rekan Contoh 2' },
  { value: 'colleague-3', label: 'Rekan Contoh 3' },
];
