// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import Toast from './components/Toast';
import LogoutModal from './components/LogoutModal';
import { logoutUser } from './services/authService';
import { getMyProfile } from './services/profileService'; // [BARU] untuk hydrate foto profil di awal sesi

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
    const storedAvatarUrl = localStorage.getItem('user_avatar_url');
    if (storedName && storedRole) {
      setCurrentUser({ name: storedName, role: storedRole, avatar_url: storedAvatarUrl });
    }
  }, []);

  // [BARU] Sebelumnya foto profil di Sidebar baru muncul setelah user membuka
  // halaman Profile (karena fetch profil lengkap cuma terjadi di sana). Efek ini
  // menutup celah itu: begitu ada sesi login yang valid (token tersimpan), kita
  // langsung fetch profil lengkap (termasuk photoUrl) dan siarkan lewat event
  // 'profile-updated' yang sama, supaya Sidebar langsung dapat foto tanpa perlu
  // diklik dulu. Berlaku sama untuk semua role karena logic ini ada di level
  // App, bukan di komponen per-role.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    let active = true;
    const hydrateProfilePhoto = async () => {
      try {
        const profile = await getMyProfile();
        if (active) {
          window.dispatchEvent(new CustomEvent('profile-updated', { detail: profile }));
        }
      } catch (error) {
        // Diamkan saja: kalau token invalid/expired, biarkan ProtectedRoute yang
        // menangani redirect. Sidebar tetap fallback ke inisial seperti biasa.
        console.error('Gagal memuat foto profil awal:', error);
      }
    };

    hydrateProfilePhoto();
    return () => { active = false; };
  }, []);

  // Profil dimuat/disimpan dari halaman Profile. Sinkronkan ringkasan user
  // yang dipakai Sidebar agar foto, nama, dan role tidak tertinggal.
  useEffect(() => {
    const syncProfileSummary = (event) => {
      const profile = event.detail;
      if (!profile) return;
      setCurrentUser((current) => ({
        ...current,
        name: profile.namaLengkap || current.name,
        avatar_url: profile.photoUrl || null,
      }));
      if (profile.namaLengkap) localStorage.setItem('user_name', profile.namaLengkap);
      if (profile.photoUrl) localStorage.setItem('user_avatar_url', profile.photoUrl);
      else localStorage.removeItem('user_avatar_url');
    };
    window.addEventListener('profile-updated', syncProfileSummary);
    return () => window.removeEventListener('profile-updated', syncProfileSummary);
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
    localStorage.removeItem('user_avatar_url');

    // Update state agar aplikasi me-render ulang dengan data user baru
    setCurrentUser({ name: userData.name, role: userData.role });

    // [BARU] Token sudah tersimpan (dilakukan authService.loginUser() sebelum
    // fungsi ini dipanggil), jadi aman untuk langsung fetch profil lengkap di
    // sini juga. Dilempar sebagai fire-and-forget agar tidak menunda toast/
    // navigasi; hasilnya tetap sampai ke Sidebar lewat event 'profile-updated'.
    getMyProfile()
      .then((profile) => {
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: profile }));
      })
      .catch((error) => {
        console.error('Gagal memuat foto profil setelah login:', error);
      });

    showToast(`Selamat datang kembali, ${userData.name}`, 'success');
    
    // TIDAK perlu navigate manual di sini.
    // Begitu token di-set di localStorage (oleh authService) dan state currentUser
    // berubah, AppRoutes akan re-render dan PublicRoute otomatis
    // mendeteksi token lalu redirect ke /dashboard.
  };

  const handleConfirmLogout = () => {
    // Bersihkan hanya data sesi login. Jangan memakai localStorage.clear()
    // karena status notifikasi yang sudah dibaca harus tetap tersimpan saat
    // pengguna login kembali.
    logoutUser();
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_avatar_url');
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

      <AppRoutes 
        user={currentUser} 
        onLogout={() => setIsLogoutModalOpen(true)} 
        onLoginSuccess={handleLoginSuccess} 
      />
                                    
      {/* 3. Global Logout Modal (Pindahkan ke PALING BAWAH) */}
      {isLogoutModalOpen && (
      <LogoutModal 
        onConfirm={handleConfirmLogout} 
        onCancel={() => setIsLogoutModalOpen(false)} 
      />
      )}
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