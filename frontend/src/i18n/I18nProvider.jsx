// src/i18n/I18nProvider.jsx
//
// Penyedia bahasa untuk seluruh aplikasi (termasuk halaman Login). Pilihan
// disimpan di localStorage ('sims_lang') dan TIDAK dihapus saat logout
// (App.jsx hanya menghapus key sesi), jadi bahasa tetap sama saat login ulang.
//
// Sengaja tanpa library eksternal: kamus berupa objek datar { 'kunci.titik': 'teks' }.
// Kunci yang belum diterjemahkan jatuh ke bahasa Indonesia (sumber), lalu ke
// nama kuncinya sendiri -- UI tidak pernah menampilkan teks kosong.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext } from './I18nContext';
import { DEFAULT_LANG, LANGUAGES, STORAGE_KEY, isSupportedLang } from './config';
import { dictionaries } from './locales';
import { renderRich } from './rich.jsx';

const readStoredLang = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isSupportedLang(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG; // localStorage bisa diblokir (mode privat)
  }
};

const interpolate = (template, params) =>
  template.replace(/\{(\w+)\}/g, (match, name) =>
    params && params[name] !== undefined && params[name] !== null ? String(params[name]) : match
  );

export default function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  // Atribut lang di <html>: dipakai screen reader & browser (pemilihan font CJK).
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!isSupportedLang(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Gagal menyimpan tidak boleh merusak UI; bahasa tetap berubah untuk sesi ini.
    }
  }, []);

  const value = useMemo(() => {
    const locale = LANGUAGES.find((item) => item.code === lang)?.locale || 'id-ID';
    const dictionary = dictionaries[lang] || {};
    const fallback = dictionaries[DEFAULT_LANG];

    const t = (key, params) => {
      const template = dictionary[key] ?? fallback[key] ?? key;
      return interpolate(template, params);
    };

    // Seperti t(), tetapi <b>..</b> di kamus menjadi <strong> (hasil: node React).
    const tRich = (key, params) => renderRich(t(key, params));

    const formatDate = (input, options = { day: 'numeric', month: 'long', year: 'numeric' }) => {
      const date = input instanceof Date ? input : new Date(input);
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(locale, options);
    };

    return { lang, locale, setLang, t, tRich, formatDate, languages: LANGUAGES };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
