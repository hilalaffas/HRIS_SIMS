-- ============================================================
-- V63__create_leave_rules.sql
--
-- Tujuan:
--   Menyimpan aturan cuti yang bisa diatur dari panel /devAccess (akun dev),
--   mulai dengan TANGGAL BERLAKU CUTI HANGUS (sebelumnya konstanta 2025-01-01
--   di LeaveForfeitCalculator). Dengan tabel ini, tahun berlaku hangus bisa
--   dikoreksi tanpa deploy ulang bila ternyata salah.
--
-- Kolom:
--   rule_key   : nama aturan. Saat ini hanya 'FORFEIT_START_DATE'.
--   date_value : nilai aturan bertipe tanggal.
--   updated_by : username terakhir yang mengubah (audit ringan).
--   updated_at : waktu perubahan terakhir.
--
-- Seed: FORFEIT_START_DATE = 2025-01-01 (sama dengan perilaku sebelumnya).
-- ============================================================

CREATE TABLE leave_rules (
    rule_key   VARCHAR(50)  PRIMARY KEY,
    date_value DATE,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO leave_rules (rule_key, date_value)
VALUES ('FORFEIT_START_DATE', DATE '2025-01-01')
ON CONFLICT (rule_key) DO NOTHING;
