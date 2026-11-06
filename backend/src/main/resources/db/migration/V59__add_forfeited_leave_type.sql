-- ============================================================
-- V59__add_forfeited_leave_type.sql
--
-- Tujuan:
--   Menambah jenis cuti sistem "Cuti hangus" untuk mencatat sisa cuti tahunan yang
--   KEDALUWARSA (tidak terpakai sampai periode anniversary berakhir). Dipakai oleh
--   import/export riwayat cuti (ledger) -- komentar sel "hangus/expired".
--
-- Cara kerja:
--   - Kolom leave_types.is_forfeiture menandai jenis cuti sistem ini.
--   - Jenis ini TIDAK memotong jatah (deducts_annual_quota = false), TIDAK muncul di
--     pilihan form Ajukan Cuti, dan TIDAK dihitung sebagai hari cuti di absensi,
--     laporan, kalender, maupun pengecekan tanggal bentrok.
--
-- Catatan: idempotent (IF NOT EXISTS / WHERE NOT EXISTS), data lama tidak berubah.
-- ============================================================

ALTER TABLE leave_types
    ADD COLUMN IF NOT EXISTS is_forfeiture BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO leave_types (name, quota_male, quota_female, deducts_annual_quota, legal_note, is_forfeiture)
SELECT 'Cuti hangus', 0, 0, false,
       'Jenis sistem: sisa cuti tahunan yang hangus/kedaluwarsa pada akhir periode. Tidak bisa diajukan.', true
WHERE NOT EXISTS (
    SELECT 1 FROM leave_types WHERE LOWER(name) = LOWER('Cuti hangus')
);

UPDATE leave_types SET is_forfeiture = true WHERE LOWER(name) = LOWER('Cuti hangus');
