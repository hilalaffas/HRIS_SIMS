// src/services/authService.js

const MOCK_USERS = [
  { username: 'staff', password: 'ASDasd123', role: 'karyawan', name: 'Iqbal Purnomo (Staff)' },
  { username: 'spv', password: 'ASDasd123', role: 'spv', name: 'Mandala Putra (Supervisor)' },
  { username: 'manager', password: 'ASDasd123', role: 'manager', name: 'Ade Mulya (Manager)' },
  { username: 'admin', password: 'ASDasd123', role: 'hr admin', name: 'Fadjri Manalu (HR Admin)' },
  { username: 'superadmin', password: 'ASDasd123', role: 'super admin', name: 'Dian Kusuma (Super Admin)' },
];

export const loginUser = async (username, password) => {
  // Simulasi loading dari server selama 800ms
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = MOCK_USERS.find(
        (u) => u.username === username && u.password === password
      );

      if (user) {
        const { password, ...userData } = user; // Hapus password dari object response
        resolve(userData);
      } else {
        reject(new Error("Username atau password salah!"));
      }
    }, 800);
  });
};

export const checkUsernameExists = async (identifier) => {
  // Simulasi pengecekan username ke server selama 500ms
  return new Promise((resolve) => {
    setTimeout(() => {
      const exists = MOCK_USERS.some((u) => u.username === identifier);
      resolve(exists);
    }, 500);
  });
};

export const requestPasswordReset = async (identifier) => {
  // Simulasi permintaan reset password ke server selama 1000ms
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!identifier || !identifier.trim()) {
        reject(new Error("Email atau username wajib diisi."));
        return;
      }

      // Catatan: demi keamanan, respons SELALU sukses baik akun ditemukan
      // atau tidak, supaya orang lain tidak bisa menebak akun mana yang terdaftar.
      // Di backend asli, pengecekan MOCK_USERS di bawah ini akan diganti
      // dengan query database + pengiriman email berisi link/token reset.
      const userExists = MOCK_USERS.some(
        (u) => u.username === identifier
      );

      resolve({
        success: true,
        message: userExists
          ? "Instruksi reset password telah dikirim."
          : "Jika akun terdaftar, instruksi reset password telah dikirim.",
      });
    }, 1000);
  });
};