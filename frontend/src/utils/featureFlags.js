// src/utils/featureFlags.js
//
// [BARU] Cache on/off untuk fitur yang bisa diaktif/nonaktifkan tanpa redeploy.
// Sumber kebenaran flag ada di SERVER (lihat services/featureFlagService.js);
// localStorage di sini hanya cache per-browser. Dipakai bersama halaman
// pengaturan tersembunyi (pages/DevSettings).
//
// Pola event-nya sengaja disamakan dengan 'sims:session-expired' di
// services/api.js: siapa pun yang perlu tahu perubahan flag tinggal dengar
// CustomEvent ini, tidak perlu context/props.
const STORAGE_PREFIX = 'sims:feature:';
export const FEATURE_FLAG_CHANGE_EVENT = 'sims:feature-flag-changed';

// [UBAH] themeToggle: tombol tema terang/gelap di footer (components/ThemeToggle.jsx).
// Flag ini sumber kebenarannya di SERVER (tabel feature_flags), BUKAN lagi
// localStorage -- lihat services/featureFlagService.js. localStorage di sini
// hanya berfungsi sebagai CACHE nilai terakhir dari server, supaya UI tidak
// berkedip saat halaman dibuka. Default false = tombol tidak tampil sampai
// server menjawab (aman untuk browser yang belum punya cache).
const DEFAULTS = {
  themeToggle: false,
};

// Key yang nilainya milik server dan ikut disalin oleh syncServerFlags().
const SERVER_FLAG_KEYS = ['themeToggle'];

function readFlag(key) {
  const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  if (stored === null) return DEFAULTS[key] ?? false;
  return stored === 'true';
}

function writeFlag(key, value) {
  localStorage.setItem(`${STORAGE_PREFIX}${key}`, value ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent(FEATURE_FLAG_CHANGE_EVENT, { detail: { key, value } }));
}

// [BARU] Menyalin nilai dari server ke cache. Hanya menulis (dan memicu event)
// kalau nilainya benar-benar berubah, jadi polling tiap menit tidak membuat
// komponen render ulang percuma.
export function syncServerFlags(flags) {
  if (!flags || typeof flags !== 'object') return;
  SERVER_FLAG_KEYS.forEach((key) => {
    if (typeof flags[key] === 'boolean' && readFlag(key) !== flags[key]) {
      writeFlag(key, flags[key]);
    }
  });
}

// [UBAH] Hanya pembaca. Mengubah nilainya lewat updateFeatureFlag()
// di services/featureFlagService.js (PUT ke server).
export const isThemeToggleEnabled = () => readFlag('themeToggle');
