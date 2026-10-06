// src/hooks/useTheme.js
//
// Mengelola tema terang/gelap untuk area aplikasi yang sudah login
// (dipakai layouts/MainLayout.jsx). Pilihan user disimpan di localStorage
// dengan key 'sims_theme' -- key ini TIDAK dihapus saat logout
// (lihat clearSessionData di App.jsx), jadi tema tetap sama saat login ulang.
//
// Default selalu TERANG. Sengaja tidak mengikuti pengaturan tema sistem
// operasi supaya user yang belum pernah menekan toggle tidak tiba-tiba
// melihat tampilan berbeda.
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'sims_theme';
export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

const readStoredTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === THEME_DARK ? THEME_DARK : THEME_LIGHT;
  } catch {
    // localStorage bisa diblokir (mode privat / kebijakan browser) -- pakai terang.
    return THEME_LIGHT;
  }
};

const persistTheme = (theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Gagal menyimpan tidak boleh merusak UI; tema tetap berubah untuk sesi ini.
  }
};

export default function useTheme() {
  // Lazy initializer: localStorage hanya dibaca sekali saat pertama render,
  // jadi tema yang benar langsung dipakai tanpa kedipan.
  const [theme, setTheme] = useState(readStoredTheme);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    setTheme(nextTheme);
    persistTheme(nextTheme);
  }, [theme]);

  return { theme, isDark: theme === THEME_DARK, toggleTheme };
}
