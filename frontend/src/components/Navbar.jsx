import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getRiwayatByUser } from '../services/cutiService'; // TAMBAHAN: Mengambil fungsi hit database service yang sama dengan ApplyCuti
import './Navbar.css'; 

// Tambahkan parameter object user untuk mengambil id data dari database/API
export default function Navbar({ toggleSidebar, user }) {
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState('');
  
  // === BAGIAN TAMBAHAN NOTIFIKASI REAL-TIME DARI DATABASE (START) ===
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // State tambahan untuk mendeteksi layar handphone (mobile)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Normalisasi data user role
  const userRole = (user?.jabatan || user?.role || 'Karyawan').toLowerCase();
  const userId = user?.id ?? 'guest';
  const userName = user?.nama || user?.name || 'Karyawan';

  useEffect(() => {
    const fetchNotificationFromDB = async () => {
      try {
        // Ambil data riwayat cuti dari API/Database
        const rawData = await getRiwayatByUser(userId);
        
        if (!rawData || rawData.length === 0) return;

        const mappedNotifications = [];

        rawData.forEach((item) => {
          const statusBerkas = item.status ? item.status.toLowerCase() : 'proses';
          const jenisCutiNama = item.rawDetail?.jenisCuti || item.jenisCuti || 'Cuti tahunan';
          const stringTanggal = item.stringTanggal || 'Tanggal tidak tersedia';
          const pemohon = item.userName || 'Karyawan';

          // 1. Logika untuk Role Pemohon (Karyawan, Leader, SPV melihat status cuti milik sendiri)
          if (item.userId === userId) {
            if (statusBerkas.includes('kembali') || statusBerkas.includes('return')) {
              mappedNotifications.push({
                id: `ret-${item.id}`,
                text: <>Pengajuan <strong>{jenisCutiNama}</strong> Anda telah <strong>dikembalikan.</strong></>,
                date: stringTanggal,
                type: "returned"
              });
            } else if (statusBerkas.includes('setuju') || statusBerkas.includes('acc')) {
              mappedNotifications.push({
                id: `app-${item.id}`,
                text: <>Pengajuan <strong>{jenisCutiNama}</strong> Anda telah <strong>disetujui.</strong></>,
                date: stringTanggal,
                type: "approved"
              });
            }
          }

          // 2. Logika untuk Atasan (Leader, SPV, Manager menerima notifikasi adanya pengajuan baru masuk)
          const isAtasanLeader = userRole.includes('leader') && item.rawDetail?.leader?.status?.toLowerCase() === 'pending';
          const isAtasanSPV = userRole.includes('spv') && item.rawDetail?.spv?.status?.toLowerCase() === 'pending';
          const isAtasanManager = userRole.includes('manager') && item.rawDetail?.manager?.status?.toLowerCase() === 'pending';

          if ((isAtasanLeader || isAtasanSPV || isAtasanManager) && item.userId !== userId) {
            mappedNotifications.push({
              id: `new-${item.id}`,
              text: <>Ada pengajuan <strong>{jenisCutiNama}</strong> baru dari Karyawan ({pemohon}) menunggu persetujuan Anda.</>,
              date: stringTanggal,
              type: "new"
            });
          }
        });

        setNotifications(mappedNotifications);
      } catch (error) {
        console.error("Gagal memuat data notifikasi dari API:", error);
      }
    };

    if (userId !== 'guest') {
      fetchNotificationFromDB();
    }
  }, [userId, userRole, showDropdown]); // Berjalan otomatis setiap kali id user berubah atau dropdown dibuka
  // === BAGIAN TAMBAHAN NOTIFIKASI REAL-TIME DARI DATABASE (END) ===

  // Effect untuk meng-update tanggal secara otomatis dalam format Indonesia & Deteksi ukuran layar
  useEffect(() => {
    const formatIndonesiaDate = () => {
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      const today = new Date().toLocaleDateString('id-ID', options);
      setCurrentDate(today);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); // Batas ukuran handphone, bisa diganti sesuai kebutuhan (misal 480 atau 768)
    };

    formatIndonesiaDate();
    window.addEventListener('resize', handleResize);
    const timer = setInterval(formatIndonesiaDate, 3600000); 
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getSubHeaderTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard': return 'Dashboard Utama';
      case '/ApplyCuti': return 'Formulir Pengajuan Cuti Baru';
      case '/history-cuti': return 'Riwayat & Pelacakan Alur Cuti';
      case '/absensi': return 'Pencatatan Absensi Karyawan';
      case '/karyawan': return 'Manajemen Data Karyawan';
      case '/approval-cuti': return 'Daftar Approval Cuti';
      case '/reject-cuti': return 'Daftar Reject Cuti';
      case '/return-cuti': return 'Daftar Return Cuti';
      default: return 'Management System';
    }
  };

  return (
    <header className="navbar-header">
      <div className="navbar-brand">
        <div className="navbar-title-container">
          <span className="badge-sims">SIMS</span>
          <h1 className="navbar-title">SYS Indonesia Management System</h1>
        </div>
        <p className="navbar-subtitle">{getSubHeaderTitle()}</p>
      </div>
      
      {/* DIEDIT: Tombol Hamburger hanya dirender jika diakses melalui handphone/mobile (lebar layar <= 768px) */}
      {isMobile && (
        <button className="btn-hamburger" onClick={toggleSidebar}>
          <i className="fa-solid fa-bars"></i>
        </button>
      )}
      
      <div className="navbar-actions">
        <span className="navbar-date">{currentDate}</span>
        
        <div className="notification-container">
          <button 
            className="btn-notification" 
            title="Notifikasi"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {notifications.length > 0 && (
              <span className="notification-badge">{notifications.length}</span>
            )}
          </button>

          {/* DROPDOWN PANEL NOTIFIKASI DISESUAIKAN PERSIS SEPERTI GAMBAR */}
          {showDropdown && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span className="notification-header-title">Notifikasi Terbaru</span>
                <button className="btn-mark-read" onClick={() => setNotifications([])}>Tandai dibaca</button>
              </div>
              <ul className="notification-list">
                {notifications.length === 0 ? (
                  <li className="notification-empty">Tidak ada notifikasi baru</li>
                ) : (
                  notifications.map(notif => (
                    <li key={notif.id} className="notification-item">
                      <div className="notification-icon-wrapper">
                        {notif.type === 'returned' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-returned">
                            <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" fill="none"/>
                            <path d="M8 12h8M8 12l3-3m-3 3l3 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {notif.type === 'approved' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-approved">
                            <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="none"/>
                            <path d="M8 12l3 3 5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {notif.type === 'new' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-new">
                            <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none"/>
                            <circle cx="12" cy="12" r="4" fill="#3b82f6"/>
                          </svg>
                        )}
                      </div>

                      <div className="notification-content">
                        <p className="notification-text">{notif.text}</p>
                        <span className="notification-time">{notif.date}</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}