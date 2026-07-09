import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // Mengecek apakah token ada di localStorage
  const token = localStorage.getItem('token'); 

  // Jika token TIDAK ada, arahkan (redirect) ke halaman login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Jika token ADA, izinkan mengakses halaman di dalamnya
  return <Outlet />;
};

export default ProtectedRoute;