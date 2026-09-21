// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import Toast from './components/Toast';
import LogoutModal from './components/LogoutModal';
import SessionExpiredModal from './components/SessionExpiredModal'; // [BARU]
import LoadingScreen from './components/LoadingScreen'; // [BARU] splash loading global saat fetch data halaman apapun
import { logoutUser } from './services/authService';
import { getMyProfile } from './services/profileService'; // [BARU] untuk hydrate foto profil di awal sesi
import { expireSessionForInactivity, getAndClearRedirectPath, getTokenExpiryMs, refreshSession } from './services/api'; // [BARU] redirect terakhir & sliding session

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

  // [BARU] Sliding session: perpanjang token diam-diam SELAMA user masih
  // aktif memakai aplikasi, supaya modal "sesi habis" di atas tidak lagi
  // muncul mendadak di tengah kerja padahal user aktif terus -- sebelumnya
  // token punya masa berlaku TETAP 1 jam sejak login tanpa peduli aktivitas.
  //
  // Kalau user BENAR-BENAR tidak aktif (mis. tab dibiarkan terbuka semalaman),
  // refresh SENGAJA tidak dipicu -- token dibiarkan kedaluwarsa apa adanya
  // supaya sifat "session timeout demi keamanan" yang asli tetap terjaga.
  //
  // Efek ini didaftarkan SEKALI untuk seluruh umur App (bukan digate oleh
  // ada/tidaknya token saat mount), karena checkAndRefresh() membaca token
  // dari localStorage LANGSUNG setiap kali jalan -- otomatis menangani
  // login/logout/refresh-halaman tanpa perlu efek terpisah untuk tiap kasus.
  useEffect(() => {
    // Ambang batas -- boleh disesuaikan sesuai kebutuhan:
    const CHECK_INTERVAL_MS = 60 * 1000;             // cek tiap 1 menit
    const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000;  // refresh 5 menit sebelum token habis
    const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;      // logout setelah tepat 1 jam tanpa aktivitas

    let lastActivityAt = Date.now();
    let refreshInFlight = false;
    let idleTimerId;

    const scheduleIdleLogout = () => {
      window.clearTimeout(idleTimerId);
      if (!localStorage.getItem('token')) return;
      idleTimerId = window.setTimeout(() => {
        // [BARU] Timer ini tidak dibatalkan saat logout, jadi bisa bangun di
        // halaman login. Tanpa token = tidak ada sesi yang perlu diakhiri.
        if (!localStorage.getItem('token')) return;
        // Cek ulang diperlukan karena timer lama dapat bangun setelah browser
        // sempat ditangguhkan lalu pengguna kembali berinteraksi.
        if (Date.now() - lastActivityAt >= INACTIVITY_LIMIT_MS) {
          expireSessionForInactivity();
        } else {
          scheduleIdleLogout();
        }
      }, INACTIVITY_LIMIT_MS);
    };

    const markActive = () => {
      if (!localStorage.getItem('token')) return;
      lastActivityAt = Date.now();
      scheduleIdleLogout();
    };

    // Login bisa terjadi lama setelah App pertama kali dimuat. Event ini
    // memastikan penghitung idle selalu dimulai dari sesi yang baru dibuat,
    // bukan dari waktu halaman login dibuka.
    const startSessionTimer = () => {
      lastActivityAt = Date.now();
      scheduleIdleLogout();
    };

    // Cuma event yang menandakan user SUNGGUHAN berinteraksi -- polling
    // background (Navbar.jsx, MainLayout.jsx, dll.) TIDAK dihitung sebagai
    // aktivitas, supaya tab yang dibiarkan idle tetap ikut logout otomatis.
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, markActive, { passive: true })
    );
    window.addEventListener('sims:session-started', startSessionTimer);
    startSessionTimer();

    const checkAndRefresh = async () => {
      if (refreshInFlight) return;

      const expiryMs = getTokenExpiryMs();
      if (!expiryMs) return; // tidak ada token / tidak terbaca -- biarkan alur lain yang menangani

      const timeLeft = expiryMs - Date.now();
      const idleFor = Date.now() - lastActivityAt;

      if (timeLeft > 0 && timeLeft <= REFRESH_BEFORE_EXPIRY_MS && idleFor <= INACTIVITY_LIMIT_MS) {
        refreshInFlight = true;
        try {
          await refreshSession();
        } catch (error) {
          // Diamkan -- kalau token ternyata sudah kedaluwarsa/invalid duluan,
          // alur 'sims:session-expired' yang sudah ada akan menangani otomatis.
          console.error('Gagal memperpanjang sesi:', error);
        } finally {
          refreshInFlight = false;
        }
      }
    };

    const intervalId = window.setInterval(checkAndRefresh, CHECK_INTERVAL_MS);

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActive));
      window.removeEventListener('sims:session-started', startSessionTimer);
      window.clearInterval(intervalId);
      window.clearTimeout(idleTimerId);
    };
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
      {/* [BARU] Global Loading Screen -- tampil otomatis setiap kali ada
          request GET (data halaman) sedang berjalan di mana pun, dipicu
          event 'sims:loading-start' / 'sims:loading-end' dari services/api.js.
          Komponen ini mengatur tampil/sembunyinya sendiri, jadi cukup
          dirender sekali di sini, tidak perlu prop apa pun. */}
      <LoadingScreen />

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
