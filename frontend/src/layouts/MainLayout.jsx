// src/layouts/MainLayout.jsx
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ThemeToggle from '../components/ThemeToggle'; // [BARU]
import useTheme from '../hooks/useTheme'; // [BARU]
import useFeatureFlag from '../hooks/useFeatureFlag'; // [BARU]
import useServerFeatureFlags from '../hooks/useServerFeatureFlags'; // [BARU]
import { isThemeToggleEnabled } from '../utils/featureFlags'; // [BARU]
import { getMenuItems } from '../config/menuConfig';
import { getPendingApprovals } from '../services/CutiService';
import { getCurrentUser } from '../services/authService';

// Pastikan Anda sudah menginstal fontawesome: npm install @fortawesome/fontawesome-free
import '@fortawesome/fontawesome-free/css/all.min.css';
import './MainLayout.css'; 

export default function MainLayout({ onLogout, user }) {
  // 1. Tambahkan state untuk kontrol sidebar di mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [approvalCount, setApprovalCount] = useState(0);
  const location = useLocation();
  // [BARU] Tema terang/gelap (disimpan di localStorage, lihat hooks/useTheme.js)
  const { theme, isDark, toggleTheme } = useTheme();
  // [UBAH] Saklar fitur dari /supersecret (disimpan di server). Kalau MATI, tombol hilang dan tema
  // dipaksa terang supaya user yang sebelumnya memilih gelap tidak "terkunci"
  // di mode gelap tanpa tombol. Pilihan tersimpannya TIDAK dihapus, jadi saat
  // fitur dinyalakan lagi tema pilihan user kembali seperti semula.
  // [BARU] Muat & segarkan flag dari server (berlaku di semua browser).
  useServerFeatureFlags();
  const isThemeToggleOn = useFeatureFlag(isThemeToggleEnabled);
  const activeTheme = isThemeToggleOn ? theme : 'light';

  // [UBAH] Akun 'supersecret' sekarang berperan sebagai SuperAdmin (lihat
  // migration V35 & ProtectedRoute.jsx) dan boleh berpindah ke halaman lain
  // seperti biasa -- jadi Sidebar/Navbar TIDAK lagi disembunyikan untuk
  // akun ini di semua halaman, cuma khusus saat dia sedang berada di
  // halaman pengaturan /supersecret itu sendiri, supaya halaman itu tetap
  // terasa seperti panel tersendiri, bukan HRIS yang "dikosongi".
  const isOnSupersecretPage =
    getCurrentUser()?.username === 'supersecret' &&
    location.pathname.toLowerCase() === '/supersecret';

  // Menu sidebar sekarang menyesuaikan role user (karyawan/manager/hr/super admin)
  const menuItems = getMenuItems(user);
  const role = String(user?.role || user?.jabatan || '').trim().toUpperCase().replace(/^ROLE_/, '');
  const canApproveLeave = ['LEADER', 'SPV', 'MANAGER'].includes(role);

  useEffect(() => {
    if (!canApproveLeave) {
      setApprovalCount(0);
      return undefined;
    }

    const refreshApprovalCount = async () => {
      try {
        // [UBAH] { silent: true } -- ini cuma badge angka approval di
        // Sidebar, bukan konten utama halaman, jadi tidak boleh memicu
        // LoadingScreen global tiap 15 detik. Lihat services/api.js.
        const pending = await getPendingApprovals({ silent: true });
        setApprovalCount(pending.length);
      } catch {
        setApprovalCount(0);
      }
    };

    refreshApprovalCount();
    const intervalId = window.setInterval(refreshApprovalCount, 15000);
    return () => window.clearInterval(intervalId);
  }, [canApproveLeave]);

  // [UBAH] data-theme dipasang di root layout: token warna gelap di
  // styles/tokens.css hanya aktif di dalam area ini (Login dsb. tidak terpengaruh).
  return (
    <div className="layout-container" data-theme={activeTheme}>
      
      {/* [UBAH] Sidebar disembunyikan khusus saat berada di /supersecret. */}
      {!isOnSupersecretPage && (
        <>
          {/* 2. Tambahkan class dinamis 'mobile-open' ke wrapper sidebar */}
          <aside className={`sidebar-wrapper ${isSidebarOpen ? 'mobile-open' : ''}`}>
            <Sidebar user={user} onLogout={onLogout} menuItems={menuItems} notificationCounts={{ approval: approvalCount }} />
          </aside>

          {/* 3. Tambahkan overlay transparan agar user bisa menutup sidebar 
                 dengan mengklik area luar sidebar saat di versi mobile */}
          {isSidebarOpen && (
            <div 
              className="mobile-overlay" 
              onClick={() => setIsSidebarOpen(false)}
            ></div>
          )}
        </>
      )}

      {/* 2. AREA KANAN (Navbar, Konten & Footer) */}
      <main className="main-area-wrapper">
        
        {/* [UBAH] Navbar juga disembunyikan khusus saat berada di /supersecret. */}
        {!isOnSupersecretPage && (
          <header className="navbar-wrapper">
            <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} user={user} />
          </header>
        )}

        {/* MAIN CONTENT / OUTLET (Tengah) */}
        <section className="content-outlet">
          {/* [BARU] key = pathname -> animasi masuk halus setiap pindah halaman */}
          <div key={location.pathname} className="route-transition">
            <Outlet />
          </div>
        </section>

        {/* 3. FOOTER (Bawah) */}
        {/* [UBAH] Modifier --centered dipakai saat toggle dimatikan, supaya teks
            kembali terpusat di mobile seperti semula. */}
        <footer className={`footer-wrapper ${isThemeToggleOn ? '' : 'footer-wrapper--centered'}`}>
          <p className="footer-copyright">© {new Date().getFullYear()} SYS Indonesia. All rights reserved.</p>
          {/* [UBAH] Toggle tema terang/gelap -- hanya dirender kalau fitur NYALA */}
          {isThemeToggleOn && (
            <div className="footer-actions">
              <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            </div>
          )}
        </footer>
        
      </main>
    </div>
  );
}