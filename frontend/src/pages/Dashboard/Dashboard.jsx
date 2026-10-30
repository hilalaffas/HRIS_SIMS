// src/pages/Dashboard/Dashboard.jsx
import React from 'react';
import { Navigate } from 'react-router-dom'; // [BARU]
import { isManagerOrSpv, isHrAdmin, isSuperAdmin } from '../../utils/roles';
import { getCurrentUser } from '../../services/authService'; // [BARU]
import { DEV_ACCESS_PATH, isDevAccessUser } from '../../config/devAccessConfig'; // [BARU]

import DashboardKaryawan from './DashboardKaryawan';
import DashboardManager from './DashboardManager';
import DashboardHR from './DashboardHR';
import DashboardSuperAdmin from './DashboardSuperAdmin';

export default function Dashboard({ user }) {
  // Pilih komponen dashboard sesuai role.
  // Urutan pengecekan penting: yang paling spesifik dicek duluan.

  // [BARU] Akun dev (role DEV) tidak punya dashboard sendiri, jadi dikembalikan
  // ke panel /devAccess. Dibaca dari getCurrentUser() karena prop `user` dari
  // App.jsx tidak membawa flag devAccess.
  if (isDevAccessUser(getCurrentUser())) {
    return <Navigate to={DEV_ACCESS_PATH} replace />;
  }

  if (isSuperAdmin(user)) {
    return <DashboardSuperAdmin user={user} />;
  }

  if (isHrAdmin(user)) {
    return <DashboardHR user={user} />;
  }

  if (isManagerOrSpv(user)) {
    return <DashboardManager user={user} />;
  }

  // Default: karyawan biasa
  return <DashboardKaryawan user={user} />;
}