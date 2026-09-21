import { Navigate, Outlet } from 'react-router-dom';
import { getTokenExpiryMs } from '../services/api';
import { logoutUser } from '../services/authService';

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

  // Jika token ADA (dan masih berlaku), arahkan (redirect) langsung ke dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  // Jika token TIDAK ada, izinkan melihat halaman login
  return <Outlet />;
};

export default PublicRoute;
