import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar({ user, onLogout, notificationCounts }) {
  const location = useLocation();

  // Mengambil role dari database (memastikan lowercase untuk konsistensi pengecekan)
  const userRole = (user?.jabatan || user?.role || 'member').toLowerCase();

  // Definisi kondisi role-role khusus
  const isSuperAdmin = userRole.includes('super_admin');
  const isHRAdmin = userRole.includes('hrd_karyawan') || userRole.includes('hrd_admin') || userRole.includes('admin') && !isSuperAdmin;
  const isManager = userRole.includes('manager') || userRole.includes('spv') || userRole.includes('leader');

  // 1. DAFTAR MENU BERDASARKAN HAK AKSES (MENYESUAIKAN GAMBAR)
  
  // Menu Utama: Super Admin hanya punya Halaman Utama, role lain punya keduanya
  const mainMenuItems = [
    { path: '/dashboard', name: 'Halaman Utama', icon: 'fa-solid fa-border-all' },
  ];

  // Tambahkan Manajemen Cuti Saya jika BUKAN Super Admin
  if (!isSuperAdmin) {
    mainMenuItems.push({ 
      path: '/ApplyCuti', 
      name: 'Manajemen Cuti Saya', 
      icon: 'fa-regular fa-calendar-check',
      // Menampilkan dot merah statis/notifikasi sesuai Gambar 1 (Karyawan) jika diperlukan
      hasDot: true 
    });
  }

  // Menu Khusus Manager (Gambar 2)
  const approvalMenuItems = [
    { 
      path: '/ApproveLeave', 
      name: 'Persetujuan Cuti', 
      icon: 'fa-regular fa-circle-check', 
      badgeStyle: { backgroundColor: '#ff4d4d' }, 
      count: notificationCounts?.approval || 1 // default ke 1 sesuai gambar jika kosong
    },
  ];

  // Menu Khusus HRD (Gambar 3)
  const hrMenuItems = [
    { path: '/karyawan', name: 'Kelola Karyawan (HR)', icon: 'fa-solid fa-users' },
  ];

  // Menu Khusus Super Admin (Gambar 4)
  const superAdminMenuItems = [
    { path: '/karyawan', name: 'Pengaturan Akun', icon: 'fa-solid fa-gear' },
  ];

  // LOGIKA HELPER INDIVIDU
  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderLinks = (items) => {
    return items.map((item) => {
      const isActive = location.pathname.startsWith(item.path) || (item.path === '/dashboard' && location.pathname === '/');
      return (
        <Link
          key={item.path}
          to={item.path}
          className={`menu-link ${isActive ? 'active' : 'inactive'}`}
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
            <span className="menu-group-label">MAIN MENU</span>
            {renderLinks(mainMenuItems)}
          </div>

          {/* 2. MENU PERSETUJUAN (Khusus Manager - Gambar 2) */}
          {isManager && (
            <div className="menu-group">
              <span className="menu-group-label">MENU PERSETUJUAN</span>
              {renderLinks(approvalMenuItems)}
            </div>
          )}

          {/* 3. SISTEM HRD (Khusus HR Admin - Gambar 3) */}
          {isHRAdmin && (
            <div className="menu-group">
              <span className="menu-group-label">SISTEM HRD</span>
              {renderLinks(hrMenuItems)}
            </div>
          )}

          {/* 4. SUPER ADMIN (Khusus Super Admin - Gambar 4) */}
          {isSuperAdmin && (
            <div className="menu-group">
              <span className="menu-group-label">SUPER ADMIN</span>
              {renderLinks(superAdminMenuItems)}
            </div>
          )}
        </nav>
      </div>
      
      {/* Tombol Logout / Keluar */}
      <div className="sidebar-footer">
        <button onClick={onLogout} className="btn-logout">
          <i className="fa-solid fa-right-from-bracket rotate-180"></i>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}