// src/routes/AppRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicRoute from '../components/PublicRoute'; 
import Login from '../pages/Login/login';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard/Dashboard';
import ApplyCuti from '../pages/Cuti/applycuti/ApplyCuti';
import ProfilePage from '../pages/Profile/profile';
import ForgotPassword from '../pages/ForgotPassword/ForgotPassword';
import ApproveLeave from '../pages/Cuti/approve/ApproveLeave';
import Karyawan from '../pages/Karyawan/Karyawan';


export default function AppRoutes({ user, onLogout, onLoginSuccess }) {
  return (
    <Routes>
      {/* 1. HALAMAN UTAMA: Otomatis lempar ke halaman login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 2. RUTE PUBLIC: Hanya bisa diakses jika BELUM login */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login onLoginSuccess={onLoginSuccess} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* 3. RUTE PROTECTED: Hanya bisa diakses jika SUDAH login */}
      <Route element={<ProtectedRoute />}>
        {/* Dibungkus MainLayout agar Sidebar & Navbar otomatis muncul */}
        <Route element={<MainLayout onLogout={onLogout} user={user} />}>

          {/* Halaman Profile */}
          <Route path="/profile" element={<ProfilePage role={user.role} />} />

          {/* Halaman Dashboard Utama (Menampilkan Berita & Kalender), beda konten per role */}
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          
          {/* Wadah Halaman Apply Cuti */}
          <Route path="/ApplyCuti" element={<ApplyCuti user={user} />} />

          {/* Wadah Halaman Approve Cuti */}
          <Route path="/ApproveLeave" element={<ApproveLeave user={user} />} />
        

          {/* Wadah Halaman History Cuti */}
          <Route path="/history-cuti" element={
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 min-h-50">
              <h3 className="text-base font-bold text-gray-800 mb-2">Riwayat & Pelacakan Alur Cuti</h3>
              <p className="text-sm text-gray-500">Wadah halaman riwayat sudah siap. Di sinilah list kartu status approval (Leader, SPV, Manager) akan berjejer.</p>
            </div>
          } />

          {/* Wadah Halaman Absensi */}
          <Route path="/absensi" element={
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 min-h-50">
              <h3 className="text-base font-bold text-gray-800 mb-2">Pencatatan Absensi Karyawan</h3>
              <p className="text-sm text-gray-500">Wadah halaman pencatatan kehadiran karyawan.</p>
            </div>
          } />

          {/* Wadah Halaman Manajemen Karyawan */}
          <Route path="/karyawan" element={<Karyawan user={user} />} />

          {/* ============================================================
              TAMBAHAN: RUTE HALAMAN YANG SEBELUMNYA BELUM ADA DI SNIPPET KAMU 
             ============================================================ */}
          <Route path="/approval-cuti" element={
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 min-h-50">
              <h3 className="text-base font-bold text-gray-800 mb-2">Daftar Approval Cuti</h3>
              <p className="text-sm text-gray-500">Wadah halaman pencatatan approval cuti.</p>
            </div>
          } />

          <Route path="/reject-cuti" element={
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 min-h-50">
              <h3 className="text-base font-bold text-gray-800 mb-2">Daftar Reject Cuti</h3>
              <p className="text-sm text-gray-500">Wadah halaman pencatatan reject cuti.</p>
            </div>
          } />

          <Route path="/return-cuti" element={
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 min-h-50">
              <h3 className="text-base font-bold text-gray-800 mb-2">Daftar Return Cuti</h3>
              <p className="text-sm text-gray-500">Wadah halaman pencatatan return cuti.</p>
            </div>
          } />

        </Route>
      </Route>

      {/* 4. CATCH-ALL ROUTE */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}