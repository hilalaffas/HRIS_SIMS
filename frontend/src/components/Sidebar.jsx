import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../services/authService';
import { DEV_ACCESS_PATH, isDevAccessUser } from '../config/devAccessConfig';
import './Sidebar.css';

export default function Sidebar({ user, onLogout, notificationCounts, onNavigate }) {
  const location = useLocation();

  // [BARU] Akun dev hanya melihat menu Pengaturan Fitur (+ tombol Keluar).
  // Username dibaca dari getCurrentUser() karena prop `user` tidak membawanya.
  const isDevAccount = isDevAccessUser(getCurrentUser());

  // Mengambil role dari database (memastikan lowercase untuk konsistensi pengecekan)
  const userRole = (user?.jabatan || user?.role || 'member').toLowerCase();

  // Definisi kondisi role-role khusus
  const isSuperAdmin = userRole.includes('super_admin');
  const isHRAdmin = userRole.includes('hrd_admin') || userRole.includes('admin') && !isSuperAdmin;
  const isManager = userRole.includes('manager') || userRole.includes('spv') || userRole.includes('leader') ||userRole.includes('hrd_karyawan');

  // 1. DAFTAR MENU BERDASARKAN HAK AKSES (MENYESUAIKAN GAMBAR)
  
  // Menu Utama: Super Admin hanya punya Halaman Utama, role lain punya keduanya
  // [UBAH] Akun dev memakai satu menu saja: Pengaturan Fitur.
  const mainMenuItems = isDevAccount
    ? [{ path: DEV_ACCESS_PATH, name: 'Pengaturan Fitur', icon: 'fa-solid fa-sliders' }]
    : [{ path: '/dashboard', name: 'Halaman Utama', icon: 'fa-solid fa-border-all' }];

  // Tambahkan Manajemen Cuti Saya jika BUKAN Super Admin (dan bukan akun dev)
  if (!isSuperAdmin && !isDevAccount) {
    // [UBAH] Menu "Manajemen Cuti Saya" dan "Pengajuan Lembur" yang sebelumnya
    // berdiri sendiri digabung jadi satu menu "Pengajuan" (cuti, sakit & izin,
    // lembur, tukar shift). Halaman lama (/ApplyCuti, /lembur) tetap bisa
    // diakses lewat URL / notifikasi, hanya tidak lagi tampil di sidebar.
    mainMenuItems.push({ 
      path: '/absensi', 
      name: 'Absensi saya', 
      icon: 'fa-regular fa-clock',
      hasDot: notificationCounts?.leaveRequest ?? false
    });
    mainMenuItems.push({
      path: '/pengajuan',
      name: 'Pengajuan',
      icon: 'fa-solid fa-clipboard-list',
      hasDot: notificationCounts?.leaveRequest ?? false
    });
  }

  // Menu Khusus Manager (Gambar 2)
  const approvalMenuItems = [
    { 
      path: '/ApproveLeave', 
      name: 'Persetujuan', 
      icon: 'fa-regular fa-circle-check', 
      badgeStyle: { backgroundColor: '#ff4d4d' }, 
      count: notificationCounts?.approval ?? 0
    },
  ];

  // Menu Khusus HRD (Gambar 3)
  const hrMenuItems = [
    { path: '/karyawan', name: 'Kelola Karyawan (HR)', icon: 'fa-solid fa-users' },
    { path: '/kelola-divisi-shift', name: 'Kelola Divisi & Shift', icon: 'fa-solid fa-layer-group' },
    // [BARU] Menu Laporan hanya untuk role HRD_ADMIN (bukan role "admin" lain)
    ...(userRole === 'hrd_admin' ? [{ path: '/laporan', name: 'Laporan', icon: 'fa-solid fa-file-lines' }] : []),
  ];

  // Menu Khusus Super Admin (Gambar 4)
  const superAdminMenuItems = [
    { path: '/karyawan', name: 'Pengaturan Akun', icon: 'fa-solid fa-gear' },
    // SuperAdmin tidak punya halaman Persetujuan Cuti, jadi tetap langsung ke Persetujuan Lembur (semua divisi).
    { path: '/persetujuan', name: 'Persetujuan Lembur', icon: 'fa-solid fa-clipboard-check' },
  ];

  // LOGIKA HELPER INDIVIDU
  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderLinks = (items) => {
    return items.map((item) => {
      // [BARU] Menu nonaktif: tampil tapi tidak bisa diklik (bukan <Link>)
      if (item.disabled) {
        return (
          <span
            key={item.path}
            className="menu-link inactive menu-link-disabled"
            aria-disabled="true"
            title="Belum tersedia untuk role Anda"
          >
            <i className={item.icon}></i>
            <span style={{ flex: 1 }}>{item.name}</span>
          </span>
        );
      }

      const isActive = location.pathname.toLowerCase().startsWith(item.path.toLowerCase()) || (item.path === '/dashboard' && location.pathname === '/');
      return (
        <Link
          key={item.path}
          to={item.path}
          className={`menu-link ${isActive ? 'active' : 'inactive'}`}
          onClick={onNavigate}
        >
          <i className={item.icon}></i>
          <span style={{ flex: 1 }}>{item.name}</span>
          
          {/* Badge Angka (Contoh: Menu Persetujuan Manager) */}
          {item.count !== undefined && item.count > 0 && (
            <span className="menu-badge" style={item.badgeStyle}>
              {item.count}
            </span>
          )}

          {/* Indikator Dot Merah (Contoh: Menu Cuti Karyawan di Gambar 1) */}
          {item.hasDot && (
            <span className="menu-dot-notification" style={{ width: '8px', height: '8px', backgroundColor: '#ff4d4d', borderRadius: '50%', display: 'inline-block' }}></span>
          )}
        </Link>
      );
    });
  };

  const hasPhoto = user?.avatar_url || user?.foto;
  const isProfileActive = location.pathname.startsWith('/profile');

  return (
    <aside className="sidebar-container">
      <div className="sidebar-content">
        
        {/* Profile Section (Tetap mengarah ke /profile) */}
        <Link 
          to="/profile" 
          className={`profile-section ${isProfileActive ? 'profile-active' : ''}`}
          onClick={onNavigate}
          style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div className="profile-avatar-container" style={{ position: 'relative' }}>
            {hasPhoto ? (
              <img 
                src={user?.avatar_url || user?.foto} 
                alt={user?.nama || user?.name || 'User'} 
                className="profile-avatar"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallbackElement = e.target.nextSibling;
                  if (fallbackElement) fallbackElement.style.display = 'flex';
                }}
              />
            ) : null}

            <div className="profile-avatar" style={{ display: hasPhoto ? 'none' : 'flex' }}>
              {getInitials(user?.nama || user?.name)}
            </div>

            <div className="profile-settings-icon">
             <i className="fa-solid fa-gear"></i>
            </div>

            <div className="avatar-overlay">EDIT PROFIL</div>
          </div>

          <h2 className="profile-name">
            {user?.nama || user?.name || 'Loading...'}
          </h2>

          <span className="profile-role">
            {user?.jabatan || user?.role || 'Loading...'}
          </span>
        </Link>



        {/* Area Menu Navigasi Dinamis */}
        <nav className="sidebar-nav">
          
          {/* 1. MAIN MENU (Tampil untuk semua role) */}
          <div className="menu-group">
            <span className="menu-group-label">{isDevAccount ? 'PENGATURAN' : 'MAIN MENU'}</span>
            {renderLinks(mainMenuItems)}
          </div>

          {/* 2. MENU PERSETUJUAN (Khusus Manager - Gambar 2) */}
          {isManager && !isDevAccount && (
            <div className="menu-group">
              <span className="menu-group-label">MENU PERSETUJUAN</span>
              {renderLinks(approvalMenuItems)}
            </div>
          )}

          {/* 3. SISTEM HRD (Khusus HR Admin - Gambar 3) */}
          {isHRAdmin && !isDevAccount && (
            <div className="menu-group">
              <span className="menu-group-label">SISTEM HRD</span>
              {renderLinks(hrMenuItems)}
            </div>
          )}

          {/* 4. SUPER ADMIN (Khusus Super Admin - Gambar 4) */}
          {isSuperAdmin && !isDevAccount && (
            <div className="menu-group">
              <span className="menu-group-label">SUPER ADMIN</span>
              {renderLinks(superAdminMenuItems)}
            </div>
          )}
        </nav>
      </div>
      
      {/* Tombol Logout / Keluar */}
      <div className="sidebar-footer">
        <button 
        onClick={() => {
          onNavigate?.();
          onLogout();
        }} 
          className="btn-logout">
          <i className="fa-solid fa-right-from-bracket rotate-180"></i>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
