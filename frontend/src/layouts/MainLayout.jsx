// src/layouts/MainLayout.jsx
import React, { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import useI18n from '../i18n/useI18n'; // [BARU]
import ThemeToggle from '../components/ThemeToggle'; // [BARU]
import useTheme from '../hooks/useTheme'; // [BARU]
import useFeatureFlag from '../hooks/useFeatureFlag'; // [BARU]
import useServerFeatureFlags from '../hooks/useServerFeatureFlags'; // [BARU]
import { isThemeToggleEnabled } from '../utils/featureFlags'; // [BARU]
import { getMenuItems } from '../config/menuConfig';
import { getPendingApprovals } from '../services/CutiService';
import { startPolling } from '../utils/polling'; // [BARU]
import { getSickApprovals } from '../services/attendanceService'; // [BARU] badge Persetujuan Sakit & Izin (HRD)
import usePresence from '../hooks/usePresence'; // [BARU] animasi keluar overlay sidebar mobile
import RouteFallback from '../components/RouteFallback'; // [BARU] indikator saat chunk halaman diunduh
import RouteErrorBoundary from '../components/RouteErrorBoundary'; // [BARU] pengaman chunk gagal dimuat
import { preloadLazyPages } from '../routes/lazyPages'; // [BARU] unduh halaman lain saat idle

// Pastikan Anda sudah menginstal fontawesome: npm install @fortawesome/fontawesome-free
// [UBAH] Performa: all.min.css (termasuk gaya Brands + kompatibilitas FA v4 yang tidak dipakai) diganti
// tiga file inti. Proyek hanya memakai kelas fa-solid dan fa-regular, jadi tampilan ikon sama persis.
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import '@fortawesome/fontawesome-free/css/regular.min.css';
import './MainLayout.css'; 

export default function MainLayout({ onLogout, user }) {
  // 1. Tambahkan state untuk kontrol sidebar di mobile
  const { t } = useI18n();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [approvalCount, setApprovalCount] = useState(0);
  const [permissionCount, setPermissionCount] = useState(0); // [BARU] sakit/izin menunggu (HRD_ADMIN)
  const location = useLocation();
  // [BARU] Overlay tetap di DOM sebentar setelah sidebar ditutup supaya bisa memudar.
  const overlay = usePresence(isSidebarOpen, 250);

  // [BARU] Setelah layout tampil & browser idle, unduh diam-diam chunk halaman
  // lain (Absensi, Lembur, Profil, dll.) agar saat menu diklik langsung terbuka.
  useEffect(() => {
    preloadLazyPages();
  }, []);
  // [BARU] Tema terang/gelap (disimpan di localStorage, lihat hooks/useTheme.js)
  const { theme, isDark, toggleTheme } = useTheme();
  // [UBAH] Saklar fitur dari /devAccess (disimpan di server). Kalau MATI, tombol hilang dan tema
  // dipaksa terang supaya user yang sebelumnya memilih gelap tidak "terkunci"
  // di mode gelap tanpa tombol. Pilihan tersimpannya TIDAK dihapus, jadi saat
  // fitur dinyalakan lagi tema pilihan user kembali seperti semula.
  // [BARU] Muat & segarkan flag dari server (berlaku di semua browser).
  useServerFeatureFlags();
  const isThemeToggleOn = useFeatureFlag(isThemeToggleEnabled);
  const activeTheme = isThemeToggleOn ? theme : 'light';

  // [BARU] Pasang tema juga di <html>. Modal yang dirender lewat createPortal ke
  // document.body (CheckoutOvertimeModal & EarlyCheckoutModal di Absensi) berada
  // DI LUAR .layout-container, jadi sebelumnya selalu terang walau tema gelap.
  // Atribut dilepas saat keluar dari layout supaya halaman Login tetap terang.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    return () => document.documentElement.removeAttribute('data-theme');
  }, [activeTheme]);

  // Menu sidebar sekarang menyesuaikan role user (karyawan/manager/hr/super admin)
  const menuItems = getMenuItems(user);
  const role = String(user?.role || user?.jabatan || '').trim().toUpperCase().replace(/^ROLE_/, '');
  const canApproveLeave = ['LEADER', 'SPV', 'MANAGER'].includes(role);
  const canApprovePermission = role === 'HRD_ADMIN'; // [BARU] persetujuan sakit & izin hanya HRD_ADMIN

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
    // [UBAH] setInterval 15 dtk -> startPolling 30 dtk (badge angka; hasil dibagi dengan Navbar lewat getPendingApprovals)
    const stopPolling = startPolling(refreshApprovalCount, 30000);
    return () => stopPolling();
  }, [canApproveLeave]);

  // [BARU] Badge "Persetujuan Sakit & Izin" di sidebar HRD_ADMIN: jumlah pengajuan sakit berstatus PENDING.
  useEffect(() => {
    // Role selain HRD_ADMIN tidak memanggil API; hitungan tetap 0 (nilai awal state).
    if (!canApprovePermission) return undefined;

    const refreshPermissionCount = async () => {
      try {
        const records = await getSickApprovals({ silent: true });
        setPermissionCount((records || []).filter((item) => String(item.approvalStatus).toUpperCase() === 'PENDING').length);
      } catch {
        setPermissionCount(0);
      }
    };

    refreshPermissionCount();
    // [UBAH] setInterval 15 dtk -> startPolling 30 dtk (badge angka)
    const stopPolling = startPolling(refreshPermissionCount, 30000);
    return () => stopPolling();
  }, [canApprovePermission]);

  // [UBAH] data-theme dipasang di root layout: token warna gelap di
  // styles/tokens.css hanya aktif di dalam area ini (Login dsb. tidak terpengaruh).
  return (
    <div className="layout-container" data-theme={activeTheme}>
      
      {/* [UBAH] Sidebar selalu tampil. Isi menunya menyesuaikan akun (akun dev
          hanya melihat menu Pengaturan Fitur, lihat components/Sidebar.jsx). */}
      {/* 2. Tambahkan class dinamis 'mobile-open' ke wrapper sidebar */}
      <aside className={`sidebar-wrapper ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <Sidebar 
        user={user} 
        onLogout={onLogout} 
        menuItems={menuItems} 
        notificationCounts={{ approval: approvalCount, permissionApproval: permissionCount }} 
        onNavigate={() => setIsSidebarOpen(false)} />
      </aside>

      {/* 3. Tambahkan overlay transparan agar user bisa menutup sidebar 
             dengan mengklik area luar sidebar saat di versi mobile */}
      {overlay.mounted && (
        <div 
          className={`mobile-overlay${overlay.closing ? ' is-closing' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* 2. AREA KANAN (Navbar, Konten & Footer) */}
      <main className="main-area-wrapper">
        
        {/* [UBAH] Navbar selalu tampil (tidak lagi disembunyikan di /devAccess). */}
        <header className="navbar-wrapper">
          <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} user={user} />
        </header>

        {/* MAIN CONTENT / OUTLET (Tengah) */}
        <section className="content-outlet">
          {/* [BARU] key = pathname -> animasi masuk halus setiap pindah halaman */}
          {/* [BARU] Suspense + error boundary DI LUAR div ber-key: halaman lazy yang
              baru selesai diunduh tetap memutar animasi masuknya. */}
          <RouteErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<RouteFallback />}>
              <div key={location.pathname} className="route-transition">
                <Outlet />
              </div>
            </Suspense>
          </RouteErrorBoundary>
        </section>

        {/* 3. FOOTER (Bawah) */}
        {/* [UBAH] Modifier --centered dipakai saat toggle dimatikan, supaya teks
            kembali terpusat di mobile seperti semula. */}
        <footer className={`footer-wrapper ${isThemeToggleOn ? '' : 'footer-wrapper--centered'}`}>
          <p className="footer-copyright">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
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