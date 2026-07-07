// src/config/menuConfig.js
import { isManagerOrSpv, isHrAdmin, isSuperAdmin } from '../utils/roles';

// Menu dasar yang dilihat SEMUA role yang sudah login
const menuBase = [
  { path: '/dashboard', name: 'Dashboard Utama', icon: 'fa-solid fa-border-all' },
  { path: '/apply-cuti', name: 'Apply Cuti', icon: 'fa-regular fa-file-lines' },
  { path: '/history-cuti', name: 'History Cuti', icon: 'fa-regular fa-clock' },
];

// Menu tambahan khusus Manager / SPV
const menuManager = [
  { path: '/approval-cuti', name: 'Approval Cuti', icon: 'fa-solid fa-check-double' },
];

// Menu tambahan khusus HR Admin
const menuHR = [
  { path: '/approval-cuti', name: 'Approval Cuti', icon: 'fa-solid fa-check-double' },
  { path: '/reject-cuti', name: 'Reject Cuti', icon: 'fa-solid fa-ban' },
  { path: '/return-cuti', name: 'Return Cuti', icon: 'fa-solid fa-rotate-left' },
  { path: '/absensi', name: 'Absensi', icon: 'fa-solid fa-fingerprint' },
  { path: '/karyawan', name: 'Manajemen Karyawan', icon: 'fa-solid fa-users' },
];

// Menu tambahan khusus Super Admin (semua akses)
const menuSuperAdmin = [
  { path: '/approval-cuti', name: 'Approval Cuti', icon: 'fa-solid fa-check-double' },
  { path: '/reject-cuti', name: 'Reject Cuti', icon: 'fa-solid fa-ban' },
  { path: '/return-cuti', name: 'Return Cuti', icon: 'fa-solid fa-rotate-left' },
  { path: '/absensi', name: 'Absensi', icon: 'fa-solid fa-fingerprint' },
  { path: '/karyawan', name: 'Manajemen Karyawan', icon: 'fa-solid fa-users' },
];

/**
 * Ambil daftar menu sidebar sesuai role user.
 */
export function getMenuItems(user) {
  if (isSuperAdmin(user)) {
    return [...menuBase, ...menuSuperAdmin];
  }

  if (isHrAdmin(user)) {
    return [...menuBase, ...menuHR];
  }

  if (isManagerOrSpv(user)) {
    return [...menuBase, ...menuManager];
  }

  // Default: karyawan biasa, cuma menu dasar
  return menuBase;
}