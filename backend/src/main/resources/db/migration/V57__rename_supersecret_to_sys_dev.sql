-- ============================================================
-- V57__rename_supersecret_to_sys_dev.sql
--
-- Tujuan:
--   Mengganti username akun dev dari 'supersecret' menjadi 'sys_dev'
--   TANPA mengubah migration lama (V34, V35, V43, V53 dikembalikan ke isi
--   aslinya). Flyway menyimpan checksum tiap migration yang sudah dijalankan,
--   jadi mengedit migration lama membuat database yang sudah ada (laptop
--   teman, Render) gagal start dengan "checksum mismatch".
--
-- Berlaku untuk semua kondisi database:
--   - Database lama   : akun 'supersecret' (role DEV dari V53) diganti nama.
--   - Database baru   : V34 membuat 'supersecret', V53 memberi role DEV,
--                       lalu migration ini mengganti namanya.
--   - Sudah 'sys_dev' : tidak ada yang berubah (NOT EXISTS), aman dijalankan ulang.
--
-- Catatan: role, password, dan data lain TIDAK berubah. Setelah ini
-- environment variable DEV_ACCESS_USERNAME harus bernilai sys_dev.
-- ============================================================

UPDATE users
SET username = 'sys_dev',
    email    = 'sys_dev@internal.local'
WHERE username = 'supersecret'
  AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'sys_dev');
