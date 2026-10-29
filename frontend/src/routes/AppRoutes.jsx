// src/routes/AppRoutes.jsx
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicRoute from '../components/PublicRoute'; 
import Login from '../pages/Login/login';
import { DEV_ACCESS_PATH } from '../config/devAccessConfig';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard/Dashboard';
import ApplyCuti from '../pages/Cuti/applycuti/ApplyCuti';
import RouteFallback from '../components/RouteFallback'; // [BARU]
import { lazyPage } from './lazyPages'; // [BARU] code-splitting per halaman
import ApproveLeave from '../pages/Cuti/approve/ApproveLeave';
import Karyawan from '../pages/Karyawan/Karyawan';
// [BARU] Halaman Riwayat Cuti (sebelumnya placeholder <div>, sekarang
// terhubung ke backend + real-time polling + pagination, lihat RiwayatCuti.jsx)
import RiwayatCuti from '../pages/Cuti/RiwayatCuti';
// [BARU] Halaman pengaturan fitur tersembunyi -- SENGAJA tidak ditambahkan
// ke config/menuConfig.js, jadi tidak muncul di Sidebar mana pun. Cuma bisa
// diakses dengan mengetik path-nya langsung (lihat rute di bawah).
// [UBAH] DevSettings, Profile, ForgotPassword, Absensi, Lembur, Persetujuan sekarang
// di-lazy-load (diunduh saat dibutuhkan / saat idle) supaya bundle awal lebih kecil.
// Halaman Cuti & Karyawan sengaja TETAP eager: beberapa class CSS global-nya
// (.form-cuti__*, .filter-status*) sama antar halaman, jadi urutan muat CSS-nya
// harus tetap seperti semula agar tampilan tidak bergeser.
const DevSettings = lazyPage(() => import('../pages/DevSettings/DevSettings'));
const ProfilePage = lazyPage(() => import('../pages/Profile/profile'));
const ForgotPassword = lazyPage(() => import('../pages/ForgotPassword/ForgotPassword'));
// [BARU] Halaman Absensi -- sebelumnya placeholder <div> statis, sekarang
// terhubung ke pages/Absensi/absensi.jsx (kartu Masuk/Keluar/Sakit,
// status hari ini, riwayat harian di samping, modal kamera, backend
// nyata). Lihat pages/Absensi/README.md.
const Absensi = lazyPage(() => import('../pages/Absensi/absensi'));
// [BARU] Halaman Pengajuan Lembur (menu di bawah Absensi saya)
const Lembur = lazyPage(() => import('../pages/Lembur/Lembur'));
// [BARU] Halaman Persetujuan Sakit & Lembur (SuperAdmin)
const Persetujuan = lazyPage(() => import('../pages/Persetujuan/Persetujuan'));
// [BARU] Halaman Pusat Pengajuan Karyawan -- wadah Cuti, Sakit & Izin, Lembur, Tukar Shift
const Pengajuan = lazyPage(() => import('../pages/Pengajuan/Pengajuan'));
// [BARU] Halaman Laporan (khusus HRD_ADMIN) -- tab pertama: Laporan Absen
const Laporan = lazyPage(() => import('../pages/Laporan/Laporan'));
import { isManagerOrSpv, isSuperAdmin, isHrAdmin } from '../utils/roles';
import KelolaDivisiShift from '../pages/Karyawan/KelolaDivisiShift';


export default function AppRoutes({ user, onLogout, onLoginSuccess }) {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* 1. HALAMAN UTAMA: Preview development langsung membuka dashboard. */}
      <Route path="/" element={<Navigate to={import.meta.env.DEV && import.meta.env.VITE_PREVIEW_MODE === 'true' ? "/dashboard" : "/login"} replace />} />

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
        

          {/* [UBAH] Wadah Halaman History Cuti -- sebelumnya placeholder statis,
              sekarang RiwayatCuti.jsx (role-aware, real-time, berpaginasi) */}
          <Route path="/history-cuti" element={<RiwayatCuti user={user} />} />

          {/* [UBAH] Wadah Halaman Absensi -- sebelumnya placeholder statis,
              sekarang Absensi.jsx (fungsional: kamera, riwayat harian,
              backend nyata; lihat pages/Absensi/README.md) */}
          <Route path="/absensi" element={<Absensi />} />

          {/* [BARU] Wadah Halaman Pengajuan Lembur */}
          <Route path="/lembur" element={<Lembur />} />

          {/* [BARU] Wadah Halaman Pusat Pengajuan Karyawan (menggabungkan Cuti, Sakit & Izin, Lembur) */}
          <Route path="/pengajuan" element={<Pengajuan user={user} />} />

          {/* [UBAH] Persetujuan Lembur: SuperAdmin tetap di halaman ini.
              Leader/SPV/Manager sekarang memakai tab "Persetujuan Lembur" di
              Pusat Persetujuan, jadi URL lama dialihkan ke sana. Role lain
              dialihkan ke dashboard (backend juga menolak 403). */}
          <Route
            path="/persetujuan"
            element={
              isSuperAdmin(user) ? <Persetujuan />
                : isManagerOrSpv(user) ? <Navigate to="/ApproveLeave?tab=lembur" replace />
                : <Navigate to="/dashboard" replace />
            }
          />

          {/* [UBAH] Surat Sakit & Izin sekarang tab di Pusat Persetujuan (/ApproveLeave).
              URL lama dialihkan ke tab tersebut (hanya Leader/SPV/Manager; backend tetap 403 untuk role lain). */}
          <Route
            path="/persetujuan-izin"
            element={<Navigate to={isManagerOrSpv(user) ? '/ApproveLeave?tab=izin' : '/dashboard'} replace />}
          />

          {/* Wadah Halaman Manajemen Karyawan */}
          <Route path="/karyawan" element={<Karyawan user={user} />} />
          <Route path="/kelola-divisi-shift" element={isHrAdmin(user) ? <KelolaDivisiShift standalone /> : <Navigate to="/dashboard" replace />} />

          {/* [BARU] Laporan -- hanya HRD_ADMIN (backend juga membatasi: 403 untuk role lain) */}
          <Route path="/laporan" element={isHrAdmin(user) ? <Laporan /> : <Navigate to="/dashboard" replace />} />

          <Route path={DEV_ACCESS_PATH} element={<DevSettings />} />

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
    </Suspense>
  );
}
