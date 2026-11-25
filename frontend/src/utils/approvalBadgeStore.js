// src/utils/approvalBadgeStore.js
//
// [BARU] Store kecil untuk angka badge merah di menu "Persetujuan" (Sidebar).
//
// MASALAH SEBELUMNYA: badge dihitung di MainLayout lewat polling 30 detik sendiri,
// terpisah dari halaman Pusat Persetujuan. Setelah ACC / Revisi / Tolak, halaman langsung
// memperbarui daftarnya tetapi badge baru berubah di polling berikutnya (sampai 30 dtk),
// begitu juga saat antrean sudah kosong.
//
// SEKARANG: ada satu sumber angka yang dibaca Sidebar. Ada dua penulis:
//   1. Halaman Pusat Persetujuan  -> publishLocalApprovalCounts() : angka berubah SAAT ITU JUGA
//      mengikuti daftar yang sedang tampil (ACC -> baris hilang -> badge ikut turun).
//   2. Polling MainLayout          -> publishPolledApprovalCounts(): untuk perubahan dari luar
//      (pengajuan baru masuk, atasan lain sudah memproses).
// Hasil polling yang DIMULAI sebelum perubahan lokal terakhir dibuang, jadi respons lama yang
// telat datang tidak bisa menaikkan lagi angka yang baru saja turun.
import { useSyncExternalStore } from 'react';

const EMPTY_COUNTS = { cuti: 0, permission: 0, overtime: 0, correction: 0 };

let counts = EMPTY_COUNTS;
let total = 0;
let lastLocalChangeAt = 0;
const listeners = new Set();

const sumCounts = (value) => Object.values(value).reduce((sum, item) => sum + (Number(item) || 0), 0);

function apply(partial) {
  const next = { ...counts, ...partial };
  const unchanged = Object.keys(next).every((key) => next[key] === counts[key]);
  if (unchanged) return;
  counts = next;
  total = sumCounts(next);
  listeners.forEach((listener) => listener());
}

/** Angka dari halaman yang sedang tampil: selalu diterapkan dan menandai "perubahan lokal terbaru". */
export function publishLocalApprovalCounts(partial) {
  lastLocalChangeAt = Date.now();
  apply(partial);
}

/** Angka dari polling latar belakang. `startedAt` = waktu request DIMULAI (Date.now()). */
export function publishPolledApprovalCounts(partial, startedAt) {
  if (startedAt < lastLocalChangeAt) return;
  apply(partial);
}

/** Dipanggil saat MainLayout dilepas (logout) supaya akun berikutnya tidak mewarisi angka lama. */
export function resetApprovalBadge() {
  counts = EMPTY_COUNTS;
  total = 0;
  lastLocalChangeAt = 0;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Total semua yang perlu diproses (cuti + sakit/izin + lembur + koreksi absensi). */
export function useApprovalBadgeTotal() {
  return useSyncExternalStore(subscribe, () => total, () => 0);
}
