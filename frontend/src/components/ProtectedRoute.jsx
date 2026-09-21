import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { saveRedirectPath } from '../services/api';
import { getCurrentUser } from '../services/authService';

// Username akun khusus yang jadi satu-satunya yang boleh mengakses halaman
// pengaturan tersembunyi (lihat routes/AppRoutes.jsx, path "/supersecret").
// Ganti di sini saja kalau suatu saat username akunnya diganti.
const SUPERSECRET_USERNAME = 'supersecret';
const SUPERSECRET_PATH = '/supersecret';

const ProtectedRoute = () => {
  // Mengecek apakah token ada di localStorage
  const token = localStorage.getItem('token');
  const location = useLocation();

  // Jika token TIDAK ada, arahkan (redirect) ke halaman login
  if (!token) {
    // Simpan URL yang sedang coba diakses (mis. user buka bookmark/link
    // langsung ke halaman protected setelah lama tidak aktif) supaya
    // App.jsx bisa mengembalikan user ke sini lagi setelah login ulang,
    // bukan selalu dilempar ke /dashboard.
    saveRedirectPath(location.pathname + location.search);

    return <Navigate to="/login" replace />;
  }

  // [UBAH] Akun 'supersecret' sekarang berperan sebagai SuperAdmin (lihat
  // migration V35) dan BOLEH mengakses halaman lain seperti akun SuperAdmin
  // biasa -- jadi baris redirect "supersecret cuma boleh di /supersecret"
  // yang tadinya di sini DIHAPUS. Yang masih dijaga cuma arah sebaliknya:
  // halaman /supersecret sendiri tetap harus tertutup untuk akun LAIN
  // (termasuk SuperAdmin biasa yang bukan akun ini), supaya switch di
  // dalamnya tidak bisa diutak-atik akun sembarang yang kebetulan tahu URL-nya.
  const isSupersecretAccount = getCurrentUser()?.username === SUPERSECRET_USERNAME;
  const isSupersecretPath = location.pathname.toLowerCase() === SUPERSECRET_PATH;

  if (isSupersecretPath && !isSupersecretAccount) {
    return <Navigate to="/dashboard" replace />;
  }

  // Jika token ADA, izinkan mengakses halaman di dalamnya
  return <Outlet />;
};

export default ProtectedRoute;
