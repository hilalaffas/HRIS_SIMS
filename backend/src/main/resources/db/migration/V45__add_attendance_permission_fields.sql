-- [BARU] Pengajuan Izin / Sakit dari popup "Ajukan Izin / Sakit" (halaman Absensi Saya).
-- Berbeda dari absen biasa, pengajuan ini TANPA selfie & GPS, tetapi punya
-- lama izin (hari) dan surat dokter yang boleh menyusul.
--
--   leave_days        : lama izin sakit dalam hari kalender, dihitung dari attendance_date
--   document_url      : surat dokter / bukti (Cloudinary); NULL = belum diunggah
--   document_required : TRUE bila pengajuan ini WAJIB melampirkan surat dokter
--                       (semua pengajuan Sakit baru). Data lama = FALSE supaya
--                       tidak muncul tombol "upload surat" di riwayat lama.
ALTER TABLE attendances ALTER COLUMN photo_url DROP NOT NULL;
ALTER TABLE attendances ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE attendances ALTER COLUMN longitude DROP NOT NULL;

ALTER TABLE attendances ADD COLUMN leave_days INT NOT NULL DEFAULT 1;
ALTER TABLE attendances ADD COLUMN document_url VARCHAR(500);
ALTER TABLE attendances ADD COLUMN document_required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN attendances.leave_days IS 'Lama izin sakit (hari kalender) mulai dari attendance_date; default 1';
COMMENT ON COLUMN attendances.document_url IS 'URL surat dokter / bukti izin; NULL bila belum diunggah';
COMMENT ON COLUMN attendances.document_required IS 'TRUE bila pengajuan wajib melampirkan surat dokter';
