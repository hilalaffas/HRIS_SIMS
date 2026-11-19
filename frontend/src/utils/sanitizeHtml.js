// src/utils/sanitizeHtml.js
// [BARU] Pembersih HTML sebelum dirender lewat dangerouslySetInnerHTML atau dimasukkan
// ke editor contentEditable. Lapisan kedua setelah sanitasi di backend
// (HtmlSanitizer.java): berita LAMA yang tersimpan sebelum sanitasi backend ada
// tetap aman ditampilkan.
//
// Yang dibuang DOMPurify: <script>, <iframe>, <style>, atribut on*, URL javascript:/data:.
// Yang dipertahankan: format editor (b, i, u, ul, ol, li, a, img, br, p, div, span).
import DOMPurify from 'dompurify';

const SANITIZE_OPTIONS = {
  USE_PROFILES: { html: true },
  // target & rel dipakai openLinksInNewTab() supaya tautan terbuka di tab baru dengan aman.
  ADD_ATTR: ['target', 'rel'],
  FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['style'],
};

// Paksa rel aman pada semua tautan target=_blank (cegah reverse tabnabbing).
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export const sanitizeHtml = (dirtyHtml) => {
  if (!dirtyHtml) return '';
  return DOMPurify.sanitize(String(dirtyHtml), SANITIZE_OPTIONS);
};
