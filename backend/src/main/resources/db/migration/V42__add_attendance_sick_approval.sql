-- [BARU] Status persetujuan untuk absensi Sakit (menu "Persetujuan Sakit &
-- Lembur" di SuperAdmin).
--   NOT_REQUIRED : absensi biasa, tidak perlu persetujuan
--   PENDING      : Sakit baru diajukan, menunggu keputusan
--   APPROVED     : Sakit disetujui
--   REJECTED     : Sakit ditolak
ALTER TABLE attendances
    ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUIRED';

-- Data Sakit yang sudah ada sebelum fitur ini dianggap sudah disetujui,
-- supaya tidak menumpuk sebagai "menunggu" di halaman persetujuan.
UPDATE attendances SET approval_status = 'APPROVED' WHERE reason = 'SAKIT';

COMMENT ON COLUMN attendances.approval_status IS 'NOT_REQUIRED, PENDING, APPROVED, atau REJECTED (hanya relevan untuk reason SAKIT)';
