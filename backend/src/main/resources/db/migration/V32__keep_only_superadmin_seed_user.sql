-- ============================================================
-- V32__keep_only_superadmin_seed_user.sql
--
-- Tujuan:
--   Menghapus akun USER hasil seed otomatis selain SUPERADMIN.
--
-- Dipertahankan:
--   SUPERADMIN
--
-- Dihapus:
--   admin
--   HRD_Admin
--   HRD_Karyawan
--   Manager
--   SPV
--   Leader
--   Member
--
-- Catatan:
--   - ROLE tidak dihapus. Yang dihapus hanya akun pada tabel users.
--   - Activity log tetap dipertahankan karena FK activity_logs.user_id
--     sudah menggunakan ON DELETE SET NULL sejak V10.
--   - Password reset request yang menunjuk ke user seed dibersihkan
--     terlebih dahulu agar FK tidak menghalangi DELETE users.
--   - Holidays.created_by yang menunjuk ke user seed di-NULL-kan
--     terlebih dahulu (kolom ini REFERENCES users(user_id) tanpa
--     ON DELETE SET NULL/CASCADE sejak V14), agar FK tidak
--     menghalangi DELETE users. Baris holiday-nya sendiri TIDAK
--     ikut terhapus.
--   - Data employees tidak ikut dihapus.
-- ============================================================

-- 1. Pastikan akun seed yang akan dihapus tidak sedang terhubung
--    ke data employees. employees.user_id adalah NOT NULL dan FK
--    sehingga akun tersebut tidak dapat dihapus jika masih dipakai.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM employees e
        JOIN users u ON u.user_id = e.user_id
        WHERE LOWER(u.username) IN (
            'admin',
            'hrd_admin',
            'hrd_karyawan',
            'manager',
            'spv',
            'leader',
            'member'
        )
    ) THEN
        RAISE EXCEPTION
            'Migration V32 dibatalkan: salah satu user seed masih terhubung ke employees. Pisahkan employee dari user tersebut terlebih dahulu.';
    END IF;
END
$$;

-- 2. Hapus password reset request yang melibatkan user seed,
--    baik sebagai pemilik request maupun sebagai approver.
DELETE FROM password_reset_requests
WHERE user_id IN (
    SELECT user_id
    FROM users
    WHERE LOWER(username) IN (
        'admin',
        'hrd_admin',
        'hrd_karyawan',
        'manager',
        'spv',
        'leader',
        'member'
    )
)
OR approved_by IN (
    SELECT user_id
    FROM users
    WHERE LOWER(username) IN (
        'admin',
        'hrd_admin',
        'hrd_karyawan',
        'manager',
        'spv',
        'leader',
        'member'
    )
);

-- 2b. Lepaskan referensi holidays.created_by yang menunjuk ke user seed.
--     Baris holiday tetap ada, hanya created_by-nya di-NULL-kan,
--     supaya DELETE users di langkah 3 tidak kena FK violation
--     dari holidays_created_by_fkey.
UPDATE holidays
SET created_by = NULL
WHERE created_by IN (
    SELECT user_id
    FROM users
    WHERE LOWER(username) IN (
        'admin',
        'hrd_admin',
        'hrd_karyawan',
        'manager',
        'spv',
        'leader',
        'member'
    )
);

-- 3. Hapus akun user seed selain SUPERADMIN.
DELETE FROM users
WHERE LOWER(username) IN (
    'admin',
    'hrd_admin',
    'hrd_karyawan',
    'manager',
    'spv',
    'leader',
    'member'
);

-- 4. Pastikan SUPERADMIN tetap tersedia.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM users
        WHERE LOWER(username) = 'superadmin'
    ) THEN
        RAISE EXCEPTION
            'Migration V32 gagal: akun SUPERADMIN tidak ditemukan.';
    END IF;
END
$$;
