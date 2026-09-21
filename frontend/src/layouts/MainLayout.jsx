// src/layouts/MainLayout.jsx
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
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

  return (
    <div className="layout-container">
      
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
          <Outlet />
        </section>

        {/* 3. FOOTER (Bawah) */}
        <footer className="footer-wrapper">
          <p>© {new Date().getFullYear()} SYS Indonesia. All rights reserved.</p>
        </footer>
        
      </main>
    </div>
  );
}