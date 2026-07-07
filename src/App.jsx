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
    // Simpan ke storage
    localStorage.setItem('token', 'dummy-token-12345'); // Nanti ganti dengan token dari API
    localStorage.setItem('user_name', userData.name);
    localStorage.setItem('user_role', userData.role);

    // Update state agar aplikasi me-render ulang dengan data user baru
    setCurrentUser({ name: userData.name, role: userData.role });
    
    showToast(`Selamat datang kembali, ${userData.name}`, 'success');
    
    // Gunakan navigate, BUKAN window.location.href
   // navigate('/dashboard'); 
   // Tunda redirect agar toast sempat tampil penuh sebelum halaman reload
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, TOAST_DURATION);
  };

  const handleConfirmLogout = () => {
    // Bersihkan storage dan kembalikan state user ke mode Guest
    localStorage.clear();
    setCurrentUser({ name: 'Guest', role: 'Guest' });
    setIsLogoutModalOpen(false);
    
    showToast('Anda berhasil keluar dari sistem.', 'success');
    
    // Gunakan navigate untuk kembali ke login
    //navigate('/login'); 
     // Tunda redirect agar toast sempat tampil penuh sebelum halaman reload
    setTimeout(() => {
      window.location.href = '/login';
    }, TOAST_DURATION);
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