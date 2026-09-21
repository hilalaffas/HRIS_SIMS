-- ============================================================
-- V34__seed_supersecret_account.sql
--
-- Tujuan:
--   Membuat SATU akun login khusus ("supersecret") yang HANYA
--   dipakai untuk mengakses halaman pengaturan tersembunyi
--   frontend (/supersecret, lihat routes/AppRoutes.jsx).
--
-- Kenapa cuma insert ke `users`, TIDAK ke `employees`:
--   GET /api/karyawan (EmployeeController.getAllKaryawan) membaca
--   HANYA dari tabel `employees` (karyawanRepository.findAll()) --
--   lihat EmployeeService.java. Login (AuthController.login) di
--   sisi lain berjalan penuh cuma dari tabel `users`; kalau tidak
--   ada baris `employees` yang terhubung, field `employee`-nya
--   sekadar null (lihat penanganan `employee != null ? ... : null`
--   di AuthController). Jadi akun ini BISA login normal, tapi
--   OTOMATIS tidak akan pernah muncul di halaman Karyawan --
--   tanpa perlu kolom/flag "hidden" tambahan apa pun.
--
-- Role yang dipakai:
--   [UBAH] 'SUPER_ADMIN' -- awalnya migration ini memakai role 'Member'
--   (supaya akun tidak kebagian hak akses admin apa pun), tapi kemudian
--   akun ini juga perlu bisa masuk ke halaman-halaman SuperAdmin biasa
--   (Dashboard, Karyawan, dll -- lihat ProtectedRoute.jsx & tombol "Buka
--   Dashboard SuperAdmin" di DevSettings.jsx), jadi role-nya dinaikkan jadi
--   SUPER_ADMIN penuh dari awal. Yang tetap membatasi akun lain supaya
--   tidak bisa membuka /supersecret bukan role ini, melainkan pengecekan
--   username di ProtectedRoute.jsx.
--
-- Password:
--   Default '1234', di-hash bcrypt (cost 10) persis seperti pola
--   seed user 'admin' di V3. GANTI lewat menu "Ubah Password" yang
--   sudah ada di halaman Profile begitu sempat -- password ini
--   sengaja lemah karena cuma dipakai untuk masuk ke satu halaman
--   pengaturan, tapi tetap sebaiknya tidak dibiarkan default lama.
--
-- ON CONFLICT DO NOTHING: idempoten, aman dijalankan ulang kalau
-- migration Flyway di-replay di environment lain (pola sama seperti V3).
-- ============================================================

INSERT INTO users (role_id, username, password, email, failed_attempts, is_active)
VALUES (
    (SELECT role_id FROM roles WHERE role_name = 'SUPER_ADMIN' LIMIT 1),
    'supersecret',
    '$2b$10$Q0h7HR1YtzGIhA8RcvGHjuOk1efExXx0NZI3y3l4.kwcAcm757eNy', -- '1234'
    'supersecret@internal.local',
    0,
    true
)
ON CONFLICT (username) DO NOTHING;
