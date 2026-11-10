// src/i18n/config.js
// Daftar bahasa yang didukung. Menambah bahasa baru = tambah satu entri di sini
// + satu file di ./locales + daftarkan di ./locales/index.js.
export const STORAGE_KEY = 'sims_lang';
export const DEFAULT_LANG = 'id';

export const LANGUAGES = [
  { code: 'id', short: 'ID', label: 'Bahasa Indonesia', locale: 'id-ID' },
  { code: 'ja', short: '日本語', label: '日本語', locale: 'ja-JP' },
];

export const isSupportedLang = (code) => LANGUAGES.some((lang) => lang.code === code);
