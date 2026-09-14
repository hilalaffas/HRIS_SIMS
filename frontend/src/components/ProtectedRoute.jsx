import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { saveRedirectPath } from '../services/api';

const ProtectedRoute = () => {
  // Mengecek apakah token ada di localStorage
  const token = localStorage.getItem('token');
  const location = useLocation();

  // Jika token TIDAK ada, arahkan (redirect) ke halaman login
  if (!token) {
    // [BARU] Simpan URL yang sedang coba diakses (mis. user buka bookmark/
    // link langsung ke halaman protected setelah lama tidak aktif) supaya
    // App.jsx bisa mengembalikan user ke sini lagi setelah login ulang,
    // bukan selalu dilempar ke /dashboard.
    saveRedirectPath(location.pathname + location.search);

    return <Navigate to="/login" replace />;
  }

  // Jika token ADA, izinkan mengakses halaman di dalamnya
  return <Outlet />;
};

export default ProtectedRoute;
