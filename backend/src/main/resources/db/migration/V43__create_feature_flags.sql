-- ============================================================
-- V43__create_feature_flags.sql
--
-- Tujuan:
--   Menyimpan saklar fitur (on/off) di SERVER, bukan di localStorage
--   browser, supaya satu perubahan dari halaman /supersecret berlaku
--   untuk SEMUA akun di SEMUA browser/perangkat.
--
-- Kolom:
--   flag_key   : nama fitur, sama persis dengan key di frontend
--                (lihat utils/featureFlags.js), mis. 'themeToggle'.
--   enabled    : TRUE = fitur nyala.
--   updated_by : username terakhir yang mengubah (audit ringan).
--   updated_at : waktu perubahan terakhir.
--
-- Seed: 'themeToggle' (tombol tema terang/gelap di footer) default NYALA.
-- ON CONFLICT DO NOTHING: idempoten, aman kalau migration di-replay.
-- ============================================================

CREATE TABLE feature_flags (
    flag_key   VARCHAR(50)  PRIMARY KEY,
    enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (flag_key, enabled)
VALUES ('themeToggle', TRUE)
ON CONFLICT (flag_key) DO NOTHING;
