// src/utils/linkUtils.js
//
// Helper tautan (link) yang dipakai BERSAMA oleh editor & tampilan berita
// (AnnouncementModal & AnnouncementSection), supaya aturan "tautan dibuka di
// tab baru" ditulis satu kali saja, bukan diulang di tiap komponen.

// Skema yang boleh dipakai untuk tautan. Selain ini (mis. `javascript:`,
// `data:`) ditolak supaya tidak bisa dipakai menyisipkan script lewat tautan.
const ALLOWED_SCHEME_PATTERN = /^(https?:\/\/|mailto:|tel:)/i;

// Tautan email/telepon dibuka oleh aplikasi bawaan perangkat, jadi tidak
// perlu (dan tidak boleh) dipaksa membuka tab baru.
const NON_WEB_SCHEME_PATTERN = /^(mailto:|tel:)/i;

// Deteksi cepat ada tag <a> atau tidak. Kalau tidak ada, HTML dikembalikan
// apa adanya tanpa di-parse ulang.
const ANCHOR_TAG_PATTERN = /<a[\s>]/i;

const isValidUrl = (value) => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

/**
 * Merapikan URL yang diketik user sebelum dijadikan tautan.
 *  - "google.com"          -> "https://google.com" (tanpa skema dianggap https)
 *  - "https://google.com"  -> tetap
 *  - "javascript:alert(1)" -> null (skema tidak diizinkan)
 *
 * Tanpa langkah ini, "google.com" yang diketik di editor menjadi tautan
 * RELATIF (mis. https://sims.example.com/dashboard/google.com), sehingga
 * tab baru terbuka tetapi menuju alamat yang salah.
 *
 * @param {string} rawUrl URL mentah dari input user.
 * @returns {string|null} URL siap pakai, atau null kalau tidak valid.
 */
export const normalizeUrl = (rawUrl) => {
  const trimmedUrl = (rawUrl || '').trim();
  if (!trimmedUrl) return null;

  const candidateUrl = ALLOWED_SCHEME_PATTERN.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  return isValidUrl(candidateUrl) ? candidateUrl : null;
};

/**
 * Menambahkan target="_blank" + rel="noopener noreferrer" pada semua tautan
 * <a href> di dalam string HTML, supaya tautan terbuka di tab baru.
 *  - rel="noopener noreferrer" mencegah halaman tujuan mengakses
 *    window.opener (reverse tabnabbing) dan tidak mengirim header Referer.
 *  - Memakai <template> supaya HTML di-parse secara "inert": script tidak
 *    jalan dan gambar tidak diunduh selama proses ini.
 *  - Tautan mailto: dan tel: dibiarkan apa adanya.
 *
 * @param {string} html String HTML konten berita.
 * @returns {string} HTML dengan tautan yang sudah dibuka di tab baru.
 */
export const openLinksInNewTab = (html) => {
  if (!html || !ANCHOR_TAG_PATTERN.test(html)) return html || '';

  const template = document.createElement('template');
  template.innerHTML = html;

  template.content.querySelectorAll('a[href]').forEach((anchor) => {
    if (NON_WEB_SCHEME_PATTERN.test(anchor.getAttribute('href'))) return;
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  });

  return template.innerHTML;
};
