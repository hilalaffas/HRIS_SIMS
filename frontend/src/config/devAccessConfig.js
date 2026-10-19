// src/config/devAccessConfig.js
//
// Satu-satunya tempat untuk mengatur route panel pengaturan dev.
// Semua file lain (App.jsx, ProtectedRoute.jsx, Sidebar.jsx, Navbar.jsx, AppRoutes.jsx)
// membaca nilai dari sini.
//
// [UBAH] Username akun dev TIDAK ditulis di frontend lagi. Server yang menentukan akun
// dev (environment variable DEV_ACCESS_USERNAME di backend) dan memberi tahu frontend
// lewat field `devAccess` pada respons login (disimpan di data user, lihat
// services/authService.js). Flag ini hanya untuk menampilkan/menyembunyikan UI --
// semua endpoint dev tetap diperiksa ulang oleh backend.

// Path route panel dev. React Router v6 tidak membedakan huruf besar/kecil,
// jadi /devAccess dan /devaccess membuka halaman yang sama.
export const DEV_ACCESS_PATH = '/devAccess';

// Cek apakah user yang sedang login adalah akun dev (berdasarkan flag dari server).
export const isDevAccessUser = (user) => Boolean(user?.devAccess);

// Cek apakah path saat ini adalah halaman dev (tidak membedakan huruf besar/kecil).
export const isDevAccessPath = (pathname = '') =>
  pathname.toLowerCase() === DEV_ACCESS_PATH.toLowerCase();
