-- [BARU] Menyimpan hasil validasi jarak check-in ke titik kantor agar riwayat
-- tidak berubah bila koordinat atau radius kantor diperbarui di kemudian hari.
-- Catatan: di branch absensi file ini bernomor V58; dinomori ulang menjadi V62
-- dan dibuat idempoten.
ALTER TABLE attendances
    ADD COLUMN IF NOT EXISTS office_distance_meters INTEGER;

ALTER TABLE attendances
    ADD COLUMN IF NOT EXISTS office_location_status VARCHAR(24);

ALTER TABLE attendances
    DROP CONSTRAINT IF EXISTS attendances_office_location_status_check;

ALTER TABLE attendances
    ADD CONSTRAINT attendances_office_location_status_check
    CHECK (office_location_status IS NULL OR office_location_status IN
        ('WITHIN_RADIUS', 'TOO_FAR', 'NOT_CONFIGURED', 'NOT_APPLICABLE'));
