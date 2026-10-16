import { Navigate, Outlet } from 'react-router-dom';
import { getTokenExpiryMs } from '../services/api';
import { getCurrentUser, logoutUser } from '../services/authService';
import { DEV_ACCESS_PATH, isDevAccessUsername } from '../config/devAccessConfig';

const PublicRoute = () => {
  // Mengecek apakah token ada di localStorage
  const token = localStorage.getItem('token');

  // [BARU] Token yang sudah kedaluwarsa (mis. sisa sesi kemarin) dibersihkan
  // diam-diam, lalu halaman login ditampilkan apa adanya. Sebelumnya token
  // basi ini melempar user ke /dashboard, request-nya gagal 401, dan modal
  // "Sesi Berakhir" muncul padahal user sebenarnya mau login.
  if (token) {
    const expiryMs = getTokenExpiryMs();
    if (expiryMs && expiryMs <= Date.now()) {
      logoutUser();
      return <Outlet />;
    }
  }

  // Jika token ADA (dan masih berlaku), arahkan (redirect) langsung ke halaman
  // awal sesuai akun: akun dev ke /devAccess, akun lain ke /dashboard.
  // Ini juga menutup celah saat PublicRoute sempat render ulang setelah token
  // tersimpan tetapi sebelum navigate() di App.jsx berjalan.
  if (token) {
    const homePath = isDevAccessUsername(getCurrentUser()?.username)
      ? DEV_ACCESS_PATH
      : '/dashboard';
    return <Navigate to={homePath} replace />;
  }

  // Jika token TIDAK ada, izinkan melihat halaman login
  return <Outlet />;
};

export default PublicRoute;
