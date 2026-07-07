// src/pages/Dashboard/Dashboard.jsx
import React from 'react';
import { isManagerOrSpv, isHrAdmin, isSuperAdmin } from '../../utils/roles';

import DashboardKaryawan from './DashboardKaryawan';
import DashboardManager from './DashboardManager';
import DashboardHR from './DashboardHR';
import DashboardSuperAdmin from './DashboardSuperAdmin';

export default function Dashboard({ user }) {
  // Pilih komponen dashboard sesuai role.
  // Urutan pengecekan penting: yang paling spesifik dicek duluan.
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