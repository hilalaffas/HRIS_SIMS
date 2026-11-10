-- [BARU] Menyimpan pilihan lokasi saat check-in (KANTOR / WFH_DINAS).
-- Data historis tetap NULL.
-- Catatan: di branch absensi file ini bernomor V56; dinomori ulang menjadi V60
-- karena V56-V59 sudah dipakai migrasi lain. Dibuat idempoten (IF NOT EXISTS /
-- DROP IF EXISTS) agar aman di database yang sudah menjalankan versi lamanya.
ALTER TABLE attendances
    ADD COLUMN IF NOT EXISTS location_type VARCHAR(20);

ALTER TABLE attendances
    DROP CONSTRAINT IF EXISTS attendances_location_type_check;

ALTER TABLE attendances
    ADD CONSTRAINT attendances_location_type_check
    CHECK (location_type IS NULL OR location_type IN ('KANTOR', 'WFH_DINAS'));
