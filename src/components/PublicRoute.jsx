import { Navigate, Outlet } from 'react-router-dom';

const PublicRoute = () => {
  // Mengecek apakah token ada di localStorage
  const token = localStorage.getItem('token');

  // Jika token ADA, arahkan (redirect) langsung ke dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  // Jika token TIDAK ada, izinkan melihat halaman login
  return <Outlet />;
};

export default PublicRoute;