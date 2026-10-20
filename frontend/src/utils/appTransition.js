// src/utils/appTransition.js
// [BARU] Transisi "keluar dari aplikasi" (logout / sesi habis).
//
// Sebelumnya logout memunculkan halaman login secara instan (potong
// langsung). Sekarang: beginAppLeave() memasang atribut `data-app-leaving`
// di <html>; aturan CSS di layouts/MainLayout.css memudarkan sidebar isi,
// navbar & konten sambil mengubah latar menjadi hijau brand -- persis warna
// halaman login -- sehingga pergantian ke login terasa seperti satu gerakan
// menyatu. Murni presentasi: tidak menyentuh state/logic sesi sama sekali.

export const APP_LEAVE_MS = 260; // sinkron dengan durasi transisi di MainLayout.css

const LEAVING_ATTR = 'data-app-leaving';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function beginAppLeave() {
  if (prefersReducedMotion()) return;
  document.documentElement.setAttribute(LEAVING_ATTR, 'true');
}

// Dilepas dengan jeda: setelah callback logout dipanggil, React butuh
// beberapa frame untuk benar-benar mengganti layout dengan halaman login.
// Kalau atribut dilepas terlalu cepat, layout sempat "berkedip" muncul lagi.
// (Di mode DEV, ProtectedRoute tidak me-redirect, jadi layout memudar balik.)
export function endAppLeave(delayMs = 400) {
  window.setTimeout(() => {
    document.documentElement.removeAttribute(LEAVING_ATTR);
  }, delayMs);
}
