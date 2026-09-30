-- Tipe divisi: REGULAR (jam kerja normal) atau SHIFTING (Non Regular).
-- Divisi yang sudah ada otomatis REGULAR; ubah lewat menu Data Divisi.
ALTER TABLE divisi
    ADD COLUMN tipe_divisi VARCHAR(20) NOT NULL DEFAULT 'REGULAR';

ALTER TABLE divisi
    ADD CONSTRAINT chk_divisi_tipe CHECK (tipe_divisi IN ('REGULAR', 'SHIFTING'));
