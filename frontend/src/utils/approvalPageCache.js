// src/utils/approvalPageCache.js
//
// [BARU] Cache memori untuk halaman Pusat Persetujuan (tab cuti).
// Tujuan: saat approver pindah menu lalu kembali, daftar langsung tampil dari data terakhir
// (stale-while-revalidate) -- data baru tetap diambil di belakang layar dan menggantikannya.
// Tanpa ini state halaman mulai dari kosong sehingga tampil "0 Permohonan" beberapa detik.
//
// Cache dibuang saat login baru (event 'sims:session-started' dari services/api.js) supaya
// akun lain tidak melihat data akun sebelumnya.
const EMPTY = { pending: null, history: null, balances: null };

let cache = EMPTY;

if (typeof window !== 'undefined') {
  window.addEventListener('sims:session-started', () => { cache = EMPTY; });
}

export const readApprovalCache = () => cache;

export const writeApprovalCache = (patch) => {
  cache = { ...cache, ...patch };
};
