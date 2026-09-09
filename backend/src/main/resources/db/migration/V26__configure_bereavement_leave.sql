-- Samakan konfigurasi data lama dengan aturan Cuti Meninggal saat ini.
-- Izin khusus: maksimal 2 hari dan tidak mengurangi saldo cuti tahunan.
UPDATE leave_types
SET quota_male = 2,
    quota_female = 2,
    deducts_annual_quota = false,
    legal_note = 'Izin khusus keluarga meninggal maksimal 2 hari dan tidak memotong jatah cuti tahunan.'
WHERE LOWER(name) = LOWER('Cuti meninggal');
