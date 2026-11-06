-- ============================================================
-- V55__add_annual_leave_used_outside_system.sql
--
-- Tujuan:
--   Menyimpan cuti tahunan yang SUDAH TERPAKAI di luar sistem (data manual
--   sebelum SIMS dipakai), supaya saldo cuti tahunan karyawan bisa
--   disesuaikan dengan catatan HR. Diisi dari halaman /devAccess
--   (edit per karyawan atau import CSV).
--
-- Cara kerja:
--   LeaveService.getLeaveBalance menambahkan nilai ini ke "terpakai" pada
--   periode anniversary yang awalnya PERSIS sama dengan
--   annual_used_outside_period_start. Di periode lain nilainya diabaikan,
--   jadi penyesuaian otomatis berhenti berlaku saat periode berganti.
--
-- Catatan:
--   - Default 0 + period_start NULL = tidak ada penyesuaian (perilaku lama).
--   - Idempotent (IF NOT EXISTS).
-- ============================================================

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS annual_used_outside_system NUMERIC(6,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS annual_used_outside_period_start DATE;
