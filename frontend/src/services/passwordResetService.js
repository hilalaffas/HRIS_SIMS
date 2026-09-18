// src/services/passwordResetService.js
// [BARU] Wrapper untuk modul /api/password-reset di backend.
// Sebelumnya alur "Lupa Sandi" di authService.js masih 100% mock (setTimeout),
// jadi tidak pernah menyentuh endpoint asli. File ini menggantikan itu, dan
// juga dipakai Navbar.jsx untuk lonceng notifikasi HR Admin.
import { api } from './api';

// Dipanggil dari halaman ForgotPassword.jsx saat karyawan submit username.
// Body: { username } -- sesuai ForgotPasswordRequest di backend.
export const submitForgotPassword = (username) => {
  return api.post('/api/password-reset/forgot-password', { username });
};

// Dipanggil dari Navbar.jsx (HR Admin / Super Admin) untuk mengisi dropdown
// lonceng notifikasi. Balikannya sudah berupa PendingPasswordResetResponse
// (bawa employeeId, employeeName, position, divisiName) -- lihat backend
// PasswordResetService.getPendingRequests().
// [UBAH] Tambah parameter config opsional ({ silent }) -- Navbar.jsx
// memanggil ini tiap 30 detik untuk badge lonceng, selalu silent supaya
// tidak memicu LoadingScreen global berulang-ulang. Lihat services/api.js.
export const getPendingResetRequests = (config = {}) => {
  return api.get('/api/password-reset/pending', config);
};

// Dipanggil dari Navbar.jsx untuk badge angka di ikon lonceng.
// Balikan: { count: number }
export const getPendingResetCount = () => {
  return api.get('/api/password-reset/count');
};

// Alur approve MANUAL (HR mengetik sendiri password dummy-nya) -- disimpan
// untuk kompatibilitas kalau suatu saat dibutuhkan lagi, tapi alur utama
// yang dipakai sekarang adalah lewat ModalDetailKaryawan (lihat
// userService.js -> updateUser dengan field passwordResetRequestId), yang
// otomatis memanggil endpoint approve di backend TANPA HR perlu isi form ini.
export const approveResetRequest = (id, { dummyPassword, notes } = {}) => {
  return api.put(`/api/password-reset/${id}/approve`, { dummyPassword, notes });
};
