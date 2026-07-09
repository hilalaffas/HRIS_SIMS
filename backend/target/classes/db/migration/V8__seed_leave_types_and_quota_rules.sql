ALTER TABLE leave_types
ADD COLUMN IF NOT EXISTS deducts_annual_quota BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE leave_types
ADD COLUMN IF NOT EXISTS legal_note VARCHAR(255);

INSERT INTO leave_types (name, quota_male, quota_female, deducts_annual_quota, legal_note)
SELECT 'Cuti tahunan', 12, 12, true, 'Jatah cuti tahunan sementara 12 hari.'
WHERE NOT EXISTS (
    SELECT 1 FROM leave_types WHERE LOWER(name) = LOWER('Cuti tahunan')
);

INSERT INTO leave_types (name, quota_male, quota_female, deducts_annual_quota, legal_note)
SELECT 'Cuti setengah hari', 12, 12, true, 'Sementara memotong jatah cuti tahunan sebesar 0.5 hari.'
WHERE NOT EXISTS (
    SELECT 1 FROM leave_types WHERE LOWER(name) = LOWER('Cuti setengah hari')
);

INSERT INTO leave_types (name, quota_male, quota_female, deducts_annual_quota, legal_note)
SELECT 'Cuti nikah (Khusus)', 3, 3, false, 'Izin khusus menikah, sementara tidak memotong jatah cuti tahunan.'
WHERE NOT EXISTS (
    SELECT 1 FROM leave_types WHERE LOWER(name) = LOWER('Cuti nikah (Khusus)')
);

INSERT INTO leave_types (name, quota_male, quota_female, deducts_annual_quota, legal_note)
SELECT 'Cuti meninggal', 2, 2, false, 'Izin khusus keluarga meninggal, sementara tidak memotong jatah cuti tahunan.'
WHERE NOT EXISTS (
    SELECT 1 FROM leave_types WHERE LOWER(name) = LOWER('Cuti meninggal')
);

INSERT INTO leave_types (name, quota_male, quota_female, deducts_annual_quota, legal_note)
SELECT 'Cuti melahirkan (Khusus)', 0, 90, false, 'Izin khusus melahirkan, sementara hanya untuk karyawan perempuan dan tidak memotong cuti tahunan.'
WHERE NOT EXISTS (
    SELECT 1 FROM leave_types WHERE LOWER(name) = LOWER('Cuti melahirkan (Khusus)')
);

INSERT INTO leave_types (name, quota_male, quota_female, deducts_annual_quota, legal_note)
SELECT 'Cuti Urgent', 12, 12, true, 'Kategori urgent sementara memotong jatah cuti tahunan sampai aturan internal ditetapkan.'
WHERE NOT EXISTS (
    SELECT 1 FROM leave_types WHERE LOWER(name) = LOWER('Cuti Urgent')
);
