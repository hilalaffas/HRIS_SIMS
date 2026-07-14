// src/utils/roles.js

export const ROLES = {
  KARYAWAN: 'member',
  LEADER: 'leader',
  SPV: 'spv',
  MANAGER: 'manager',
  HR_ADMIN: 'hrd_admin',
  SUPER_ADMIN: 'super_admin',
};

/**
 * Ambil role user secara aman & konsisten (lowercase, ada fallback).
 */
export function getUserRole(user) {
  return (user?.jabatan || user?.role || ROLES.KARYAWAN).toLowerCase();
}

export function isSuperAdmin(user) {
  const role = getUserRole(user);
  return role === ROLES.SUPER_ADMIN || role === 'superadmin';
}

/**
 * Leader, SPV, dan Manager sama-sama diarahkan ke DashboardManager.
 * (Nama fungsi dipertahankan supaya import di Dashboard.jsx tidak perlu diubah.)
 */
export function isManagerOrSpv(user) {
  const role = getUserRole(user);
  return role === ROLES.MANAGER || role === ROLES.SPV || role === ROLES.LEADER;
}

export function isHrAdmin(user) {
  return getUserRole(user) === ROLES.HR_ADMIN;
}