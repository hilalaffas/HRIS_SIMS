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

/**
 * [BARU] Karyawan yang boleh muncul di laporan/ekspor: akun SUPER_ADMIN
 * (termasuk akun dev supersecret) disembunyikan, hanya karyawan asli.
 * [UBAH] Role DEV ikut disembunyikan.
 * Dipakai ekspor di halaman Manajemen Karyawan.
 */
export function isReportEmployee(employee) {
  const roleName = String(employee?.user?.roleId?.roleName || '').toLowerCase();
  return roleName !== ROLES.SUPER_ADMIN && roleName !== 'superadmin' && roleName !== 'dev';
}
