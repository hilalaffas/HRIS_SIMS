// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import Toast from './components/Toast';
import LogoutModal from './components/LogoutModal';
import SessionExpiredModal from './components/SessionExpiredModal'; // [BARU]
import { logoutUser } from './services/authService';
import { getMyProfile } from './services/profileService'; // [BARU] untuk hydrate foto profil di awal sesi
import { getAndClearRedirectPath } from './services/api'; // [BARU] alur "kembali ke halaman terakhir"

import './App.css'; 

// 1. Pisahkan konten utama ke dalam komponen terpisah
// Agar kita bisa menggunakan hook useNavigate dari react-router-dom
const AppContent = () => {
  const navigate = useNavigate();
  
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  // [BARU] null = modal sesi habis tersembunyi; string = tampil dengan pesan ini
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // Gunakan state untuk user agar UI langsung ter-update saat login/logout
  const [currentUser, setCurrentUser] = useState({ name: 'Guest', role: 'Guest' });

  // Ambil data user dari localStorage hanya saat aplikasi pertama kali dimuat
  useEffect(() => {
    const storedName = localStorage.getItem('user_name');
    const storedRole = localStorage.getItem('user_role');
    const storedGender = localStorage.getItem('user_gender');
    const storedAvatarUrl = localStorage.getItem('user_avatar_url');
    if (storedName && storedRole && storedGender) {
      setCurrentUser({ name: storedName, role: storedRole,storedGender, avatar_url: storedAvatarUrl });
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

  // [BARU] Sesi habis (token tidak ada/tidak valid/kedaluwarsa) dideteksi
  // secara terpusat di services/api.js setiap kali sebuah panggilan API
  // gagal dengan 401 + errorCode SESSION_EXPIRED. api.js sendiri tidak
  // menyentuh state React (dia cuma lapisan network), jadi dia broadcast
  // lewat CustomEvent di window, dan di sinilah App.jsx menangkapnya untuk
  // menampilkan modal. Pola ini menjaga api.js tetap murni & tidak
  // ter-coupling ke React.
  useEffect(() => {
    const handleSessionExpired = (event) => {
      setSessionExpiredMessage(
        event.detail?.message ||
        'Sesi Anda telah berakhir demi keamanan. Silakan login kembali.'
      );
    };
    window.addEventListener('sims:session-expired', handleSessionExpired);
    return () => window.removeEventListener('sims:session-expired', handleSessionExpired);
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
    localStorage.setItem('user_gender', userData.gender);
    localStorage.removeItem('user_avatar_url');

    // Update state agar aplikasi me-render ulang dengan data user baru
    setCurrentUser({ name: userData.name, role: userData.role, gender:userData.gender });

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

    // [UBAH] Sebelumnya redirect ke /dashboard diserahkan begitu saja ke
    // PublicRoute (yang path tujuannya selalu hardcode /dashboard). Sekarang
    // navigate dilakukan eksplisit di sini supaya kita bisa mengembalikan
    // user ke halaman terakhir yang dia akses sebelum sesi habis / sebelum
    // diarahkan ke /login (disimpan services/api.js atau ProtectedRoute.jsx
    // lewat saveRedirectPath()). Kalau tidak ada URL tersimpan, fallback ke
    // /dashboard seperti perilaku semula.
    const redirectPath = getAndClearRedirectPath();
    navigate(redirectPath || '/dashboard', { replace: true });
  };

  // [BARU] Diekstrak dari handleConfirmLogout supaya logic yang sama persis
  // (hapus token + data user dari localStorage) bisa dipakai ulang oleh
  // handleSessionExpiredConfirm() di bawah -- logout manual dan "sesi habis"
  // pada dasarnya butuh pembersihan sesi yang identik.
  const clearSessionData = () => {
    // Bersihkan hanya data sesi login. Jangan memakai localStorage.clear()
    // karena status notifikasi yang sudah dibaca harus tetap tersimpan saat
    // pengguna login kembali.
    logoutUser();
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_gender');
    localStorage.removeItem('user_avatar_url');
    setCurrentUser({ name: 'Guest', role: 'Guest' });
  };

  const handleConfirmLogout = () => {
    clearSessionData();
    setIsLogoutModalOpen(false);

    showToast('Anda berhasil keluar dari sistem.', 'success');

    // TIDAK perlu navigate manual di sini.
    // Begitu localStorage.clear() dipanggil dan state currentUser berubah,
    // AppRoutes akan re-render dan ProtectedRoute otomatis mendeteksi
    // token yang sudah hilang lalu redirect ke /login.
  };

  // [BARU] Dipanggil saat user klik tombol "OK" di SessionExpiredModal.
  // BEDA dengan handleConfirmLogout: di sini kita WAJIB navigate manual ke
  // /login, karena user bisa saja sedang di halaman yang tidak dibungkus
  // ProtectedRoute pada saat token kedaluwarsa terdeteksi (mis. request
  // background/polling), jadi tidak selalu ada re-render otomatis yang
  // memicu redirect seperti pada alur logout manual biasa.
  const handleSessionExpiredConfirm = () => {
    clearSessionData();
    setSessionExpiredMessage(null);
    navigate('/login', { replace: true });
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

      {/* [BARU] 4. Global Session Expired Modal -- tampil di atas semua
          halaman (termasuk halaman protected manapun) begitu event
          'sims:session-expired' diterima. Tidak ada tombol "Batal": user
          WAJIB klik OK untuk lanjut, sesuai alur yang diminta. */}
      {sessionExpiredMessage && (
        <SessionExpiredModal
          message={sessionExpiredMessage}
          onConfirm={handleSessionExpiredConfirm}
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