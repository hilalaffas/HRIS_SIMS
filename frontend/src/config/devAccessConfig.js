// src/config/devAccessConfig.js
//
// Satu-satunya tempat untuk mengatur akun dan route panel pengaturan dev.
// Semua file lain (App.jsx, ProtectedRoute.jsx, MainLayout.jsx, AppRoutes.jsx)
// membaca nilai dari sini, jadi kalau path atau username berubah cukup edit di sini.

// Username akun dev di database (lihat migration V34). JANGAN diganti di sini
// kalau username di database belum diganti, karena backend juga memeriksanya.
export const DEV_ACCESS_USERNAME = 'supersecret';

// Path route panel dev. React Router v6 tidak membedakan huruf besar/kecil,
// jadi /devAccess dan /devaccess membuka halaman yang sama.
export const DEV_ACCESS_PATH = '/devAccess';

// Cek apakah akun yang sedang login adalah akun dev.
export const isDevAccessUsername = (username) => username === DEV_ACCESS_USERNAME;

// Cek apakah path saat ini adalah halaman dev (tidak membedakan huruf besar/kecil).
export const isDevAccessPath = (pathname = '') =>
  pathname.toLowerCase() === DEV_ACCESS_PATH.toLowerCase();
