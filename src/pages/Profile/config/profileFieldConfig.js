// src/pages/Profile/config/profileFieldConfig.js

// Daftar role yang valid — value HARUS sama persis (case-sensitive) dengan
// field `role` di MOCK_USERS pada authService.js, karena Profile.jsx melakukan
// PROFILE_BY_ROLE[role] menggunakan role hasil loginUser() apa adanya.
export const ROLES = {
  STAFF: 'Member',              // authService: 'Member'
  LEADER: 'Leader',             // authService: 'Leader'
  SPV: 'SPV',                   // authService: 'SPV'
  MANAGER: 'Manager',           // authService: 'Manager'
  HRD_KARYAWAN: 'HRD_Karyawan', // authService: 'HRD_Karyawan'
  HRD_ADMIN: 'HRD_Admin',       // authService: 'HRD_Admin'
  SUPER_ADMIN: 'SUPER_ADMIN',   // authService: 'SUPER_ADMIN'
};

// Field-field berikut (NIK, Jabatan, Divisi, Tanggal Bergabung) TIDAK BOLEH diedit
// oleh siapa pun lewat halaman profil ini — termasuk HRD_Admin & SUPER_ADMIN.
// Semua role melihat field ini sebagai read-only. Perubahan data ini (kalau memang
// perlu) dilakukan lewat modul lain di luar halaman profil (mis. modul HR/Karyawan).
const LOCKED_FOR_ALL_ROLES = Object.values(ROLES);

// Kunci field kontak darurat & hubungannya — dipakai untuk menggabungkan
// keduanya dalam satu baris tampilan (lihat ProfileEditModal & ProfileViewSection).
export const EMERGENCY_CONTACT_KEY = 'nomorTeleponDarurat';
export const EMERGENCY_RELATION_KEY = 'hubunganDarurat';

// Pilihan dropdown untuk field "Hubungan" (relasi dengan kontak darurat)
export const EMERGENCY_RELATION_OPTIONS = ['Orang Tua', 'Pasangan', 'Saudara Kandung', 'Teman Dekat'];

// Konfigurasi field.
// `lockedFor`: daftar role yang TIDAK BOLEH mengedit field ini.
// Field tanpa `lockedFor` berarti semua role boleh mengedit.
export const FIELD_CONFIG = [
  { key: 'namaLengkap', label: 'Nama Lengkap', column: 'kiri', section: 'umum' },
  { key: 'nikKaryawan', label: 'NIK / ID Karyawan', lockedFor: LOCKED_FOR_ALL_ROLES, column: 'kiri', section: 'umum' },
  { key: 'jabatan', label: 'Jabatan / Posisi', lockedFor: LOCKED_FOR_ALL_ROLES, column: 'kiri', section: 'umum' },
  { key: 'alamatLengkap', label: 'Alamat Lengkap', textarea: true, column: 'kiri', section: 'umum', fullWidth: true },
  { key: 'email', label: 'Alamat Email', column: 'kanan', section: 'kontak' },
  { key: 'divisi', label: 'Divisi / Departemen', lockedFor: LOCKED_FOR_ALL_ROLES, column: 'kanan', section: 'kontak' },
  { key: 'nomorTelepon', label: 'Nomor Telepon Pribadi', column: 'kanan', section: 'kontak' },
  { key: EMERGENCY_CONTACT_KEY, label: 'Nomor Telepon Darurat (Urgent) *', required: true, column: 'kanan', section: 'kontak' },
  {
    key: EMERGENCY_RELATION_KEY,
    label: 'Hubungan',
    required: true,
    select: true,
    options: EMERGENCY_RELATION_OPTIONS,
    column: 'kanan',
    section: 'kontak',
  },
  { key: 'tanggalBergabung', label: 'Tanggal Mulai Bergabung', lockedFor: LOCKED_FOR_ALL_ROLES, column: 'kanan', section: 'kontak' },
];
