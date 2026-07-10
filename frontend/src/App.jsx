// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import Toast from './components/Toast';
import LogoutModal from './components/LogoutModal';

import './App.css'; 

// 1. Pisahkan konten utama ke dalam komponen terpisah
// Agar kita bisa menggunakan hook useNavigate dari react-router-dom
const AppContent = () => {
  const navigate = useNavigate();
  
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // Gunakan state untuk user agar UI langsung ter-update saat login/logout
  const [currentUser, setCurrentUser] = useState({ name: 'Guest', role: 'Guest' });

  // Ambil data user dari localStorage hanya saat aplikasi pertama kali dimuat
  useEffect(() => {
    const storedName = localStorage.getItem('user_name');
    const storedRole = localStorage.getItem('user_role');
    if (storedName && storedRole) {
      setCurrentUser({ name: storedName, role: storedRole });
    }
  }, []);

  const TOAST_DURATION = 2500; // durasi toast tampil (ms), bisa disesuaikan 2000-3000
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), TOAST_DURATION);
  };

  const handleLoginSuccess = (userData) => {
    // Catatan: token ASLI dari backend sudah disimpan duluan oleh authService.loginUser()
    // (lewat api.js -> setToken(), key localStorage 'token' -- sama dengan yang dicek
    // ProtectedRoute/PublicRoute). Jadi di sini TIDAK perlu (dan TIDAK BOLEH) menimpa
    // dengan token dummy lagi.
    localStorage.setItem('user_name', userData.name);
    localStorage.setItem('user_role', userData.role);

    // Update state agar aplikasi me-render ulang dengan data user baru
    setCurrentUser({ name: userData.name, role: userData.role });
    
    showToast(`Selamat datang kembali, ${userData.name}`, 'success');
    
    // TIDAK perlu navigate manual di sini.
    // Begitu token di-set di localStorage (oleh authService) dan state currentUser
    // berubah, AppRoutes akan re-render dan PublicRoute otomatis
    // mendeteksi token lalu redirect ke /dashboard.
  };

  const handleConfirmLogout = () => {
    // Bersihkan storage dan kembalikan state user ke mode Guest
    localStorage.clear();
    setCurrentUser({ name: 'Guest', role: 'Guest' });
    setIsLogoutModalOpen(false);
    
    showToast('Anda berhasil keluar dari sistem.', 'success');
    
    // TIDAK perlu navigate manual di sini.
    // Begitu localStorage.clear() dipanggil dan state currentUser berubah,
    // AppRoutes akan re-render dan ProtectedRoute otomatis mendeteksi
    // token yang sudah hilang lalu redirect ke /login.
  };

  return (
    <div className="app-container">
      {/* Global Toast Notification */}
      {toast.show && <Toast message={toast.message} type={toast.type} />}

      {/* Global Logout Modal */}
      {isLogoutModalOpen && (
        <LogoutModal 
          onConfirm={handleConfirmLogout} 
          onCancel={() => setIsLogoutModalOpen(false)} 
        />
      )}

      {/* Main Application Routes */}
      <AppRoutes 
        user={currentUser} 
        onLogout={() => setIsLogoutModalOpen(true)} 
        onLoginSuccess={handleLoginSuccess} 
      />
    </div>
  );
};

// 2. Komponen utama hanya bertugas menyediakan Router Context
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;