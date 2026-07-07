import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css'; 

export default function Navbar({toggleSidebar}) {
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState('');

  // Effect untuk meng-update tanggal secara otomatis dalam format Indonesia
  useEffect(() => {
    const formatIndonesiaDate = () => {
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      // Menggunakan locale 'id-ID' untuk format bahasa Indonesia
      const today = new Date().toLocaleDateString('id-ID', options);
      setCurrentDate(today);
    };

    formatIndonesiaDate();
    // Update setiap jam untuk memastikan tanggal berganti dengan akurat
    const timer = setInterval(formatIndonesiaDate, 3600000); 
    
    return () => clearInterval(timer);
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
      {/* 2. Tambahkan Tombol Hamburger di sisi paling kiri (sebelum brand) */}
      <button className="btn-hamburger" onClick={toggleSidebar}>
        <i className="fa-solid fa-bars"></i>
      </button>
      {/* Bagian Kiri: Judul & Sub-judul */}
      <div className="navbar-brand">
        <div className="navbar-title-container">
          <span className="badge-sims">SIMS</span>
          <h1 className="navbar-title">SYS Indonesia Management System</h1>
        </div>
        <p className="navbar-subtitle">{getSubHeaderTitle()}</p>
      </div>
      
      {/* Bagian Kanan: Tanggal, Lonceng */}
      <div className="navbar-actions">
        <span className="navbar-date">{currentDate}</span>
        
        {/* Tombol Lonceng Notifikasi dengan Badge Merah */}
        <button className="btn-notification" title="Notifikasi">
          <i className="fa-regular fa-bell"></i>
          <span className="notification-badge"></span>
        </button>

      </div>
    </header>
  );
}