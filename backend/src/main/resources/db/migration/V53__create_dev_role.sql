-- ============================================================
-- V53__create_dev_role.sql
--
-- Tujuan:
--   Membuat role khusus 'DEV' untuk akun dev (supersecret), supaya akun ini
--   terpisah dari SUPER_ADMIN dan mudah disembunyikan dari daftar karyawan,
--   pemilihan karyawan, dan laporan.
--
-- Catatan:
--   - Idempotent: aman dijalankan ulang (ON CONFLICT DO NOTHING).
--   - Role DEV tidak muncul di dropdown role (disaring RoleController) dan
--     tidak bisa dipakai saat register (ditolak AuthController).
--   - Baris employees tidak disentuh (supersecret memang tidak punya profil
--     karyawan sejak V35).
-- ============================================================

INSERT INTO roles (role_name)
VALUES ('DEV')
ON CONFLICT (role_name) DO NOTHING;

UPDATE users
SET role_id = (SELECT role_id FROM roles WHERE role_name = 'DEV' LIMIT 1)
WHERE username = 'supersecret';
