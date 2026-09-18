// src/services/karyawanService.js
import { api } from './api'; // Import dari folder yang sama

// [UBAH] registerKaryawan & updateKaryawan SEBELUMNYA pakai fetch() mentah
// sendiri-sendiri (duplikat logic ambil token, cek response.ok, parse
// error) supaya bisa kirim FormData tanpa di-JSON.stringify oleh api.js.
// Sekarang cukup pakai api.postForm/api.putForm (lihat services/api.js) --
// sama-sama tidak menstringify body, tapi tetap lewat SATU wrapper
// terpusat. Efeknya: token, format pesan error, dan deteksi sesi habis
// (401 SESSION_EXPIRED -> auto-redirect ke /login) otomatis berlaku juga
// untuk dua fungsi ini, tanpa perlu ditulis ulang di sini.

// 1. CREATE / REGISTER (Khusus FormData, bypass JSON.stringify dari api.js)
export const registerKaryawan = (formData) => {
    return api.postForm('/api/auth/register', formData);
};

// 2. GET LIST (Bisa langsung pakai wrapper api.js)
// [UBAH] Tambah parameter config opsional ({ silent }) -- dipakai
// Karyawan.jsx (fetchKaryawan) supaya polling background silent tidak
// memicu LoadingScreen global berulang-ulang. Lihat services/api.js.
export const getKaryawanList = (config = {}) => {
    return api.get('/api/karyawan', config); // Ganti dengan endpoint Get All Karyawan Anda
};

// 3. UPDATE (Khusus FormData juga, sama seperti register -- backend-nya
// consumes = MULTIPART_FORM_DATA_VALUE karena ada upload foto)
export const updateKaryawan = (id, formData) => {
    return api.putForm(`/api/karyawan/${id}`, formData);
};

// 4. DELETE
export const deleteKaryawan = (id) => {
    return api.delete(`/api/karyawan/${id}`);
};
