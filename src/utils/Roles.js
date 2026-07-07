// src/utils/roles.js

export const ROLES = {
  KARYAWAN: 'karyawan',
  SPV: 'spv',
  MANAGER: 'manager',
  HR_ADMIN: 'hr admin',
  SUPER_ADMIN: 'super admin',
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

export function isManagerOrSpv(user) {
  const role = getUserRole(user);
  return role === ROLES.MANAGER || role === ROLES.SPV;
}

export function isHrAdmin(user) {
  return getUserRole(user) === ROLES.HR_ADMIN;
}