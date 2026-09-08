// src/services/authService.js
import { api, setToken, clearToken } from './api';

const USER_KEY = 'sims_user';

/**
 * Login ke backend asli lewat POST /api/auth/login.
 * Response backend (LoginResponse): { token, username, role, gender, employeeId }
 *
 * CATATAN: backend saat ini belum mengembalikan nama lengkap user di response
 * login, jadi field `name` untuk sementara memakai `username`. Kalau nanti ada
 * endpoint profil (misal GET /api/users/me) yang mengembalikan nama lengkap,
 * kabari saya supaya field ini disambungkan ke sana.
 */
export const loginUser = async (username, password) => {
  const data = await api.post('/api/auth/login', { username, password });

  if (!data?.token) {
    throw new Error('Login gagal: token tidak diterima dari server.');
  }

  setToken(data.token);

  const userData = {
    username: data.username,
    role: data.role,
    gender: data.gender,
    employeeId: data.employeeId,
    name: data.username, // sementara, lihat catatan di atas
  };

  localStorage.setItem(USER_KEY, JSON.stringify(userData));
  return userData;
};

export const logoutUser = () => {
  clearToken();
  localStorage.removeItem(USER_KEY);
};

/**
 * Ambil user yang sedang login dari localStorage (dipakai saat reload halaman,
 * supaya session tidak hilang tanpa perlu login ulang selama token masih valid).
 */
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// [UBAH] checkUsernameExists & requestPasswordReset (yang sebelumnya mock
// pakai setTimeout di sini) sudah DIHAPUS. Alur "Lupa Sandi" sekarang
// langsung hit endpoint asli lewat submitForgotPassword() di
// services/passwordResetService.js, dipakai dari ForgotPassword.jsx.
// Backend (bukan frontend) yang memvalidasi apakah username ada atau tidak,
// jadi tidak perlu lagi ada langkah "check" terpisah sebelum submit.