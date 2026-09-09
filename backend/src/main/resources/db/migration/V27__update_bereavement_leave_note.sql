UPDATE leave_types
SET legal_note = 'Izin khusus keluarga meninggal maksimal 2 hari kerja dan tidak memotong jatah cuti tahunan.'
WHERE LOWER(name) = LOWER('Cuti meninggal');
