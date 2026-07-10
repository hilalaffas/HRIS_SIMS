// src/services/authService.js
import { api, setToken, clearToken } from './api';

const USER_KEY = 'sims_user';

/**
 * Login ke backend asli lewat POST /api/auth/login.
 * Response backend (LoginResponse): { token, username, role }
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

/**
 * BELUM TERSAMBUNG KE BACKEND SUNGGUHAN.
 * Endpoint POST /api/password-reset/forgot-password sudah ada di SecurityConfig
 * (permitAll), tapi bentuk request/response DTO-nya belum saya lihat, jadi
 * fungsi ini masih mock supaya alur "Lupa Password" di UI tidak error.
 * Kabari kalau mau saya sambungkan ke endpoint aslinya.
 */
export const checkUsernameExists = async (identifier) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(!!identifier);
    }, 300);
  });
};

export const requestPasswordReset = async (identifier) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!identifier || !identifier.trim()) {
        reject(new Error('Email atau username wajib diisi.'));
        return;
      }
      resolve({
        success: true,
        message: 'Jika akun terdaftar, instruksi reset password telah dikirim.',
      });
    }, 500);
  });
};