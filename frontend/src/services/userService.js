// src/services/userService.js
// Wrapper untuk endpoint akun user (username, email, role, password).
// Backend memisahkan dua tabel: employees (data pribadi & kepegawaian) dan
// users (kredensial login & hak akses) -- lihat Employee.java yang punya
// relasi @ManyToOne ke User. Karena itu, menyimpan form "Edit Karyawan"
// butuh DUA panggilan API terpisah:
//   - PUT /api/karyawan/{employeeId}  -> data karyawan (karyawanService.js)
//   - PUT /api/users/{userId}         -> akun login (fungsi di file ini)
//
// Body dikirim sebagai JSON biasa (bukan FormData), sesuai UpdateUserRequest
// di backend: { username, email, idRole, password }.
import { api } from './api';

export const updateUser = async (userId, payload) => {
  return api.put(`/api/users/${userId}`, payload);
};
