-- [BARU] Menyimpan sesi untuk "Cuti setengah hari" (PAGI / SIANG).
-- NULL untuk semua jenis cuti lainnya (cuti penuh 1 hari atau lebih).
ALTER TABLE leave_requests
    ADD COLUMN session VARCHAR(10);

COMMENT ON COLUMN leave_requests.session IS
    'Sesi untuk Cuti setengah hari: PAGI atau SIANG. NULL untuk jenis cuti lainnya.';
