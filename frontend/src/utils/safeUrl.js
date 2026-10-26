// src/utils/safeUrl.js
//
// [BARU] Tautan dari server (foto bukti, surat dokter, dll.) dipakai langsung sebagai
// href. Kalau nilainya skema berbahaya seperti "javascript:" atau "data:", klik pada
// tautan itu akan MENJALANKAN skrip di halaman aplikasi (XSS). Fungsi ini hanya
// meloloskan http(s); selain itu dianggap tidak ada (null).
//
// Contoh pemakaian:
// const href = toSafeHttpUrl(record.documentUrl); // 'https://...' atau null
export function toSafeHttpUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = new URL(value.trim(), window.location.origin);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}
