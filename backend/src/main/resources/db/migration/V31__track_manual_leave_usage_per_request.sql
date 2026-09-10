-- Simpan porsi Sisa Cuti (lama/manual) yang benar-benar dipakai
-- oleh setiap pengajuan yang sudah APPROVED.
--
-- Nilai default 0 penting untuk histori lama: saldo manual yang baru diisi
-- HR TIDAK boleh mengubah histori cuti tahunan yang terjadi sebelumnya.
ALTER TABLE leave_requests
ADD COLUMN manual_leave_days NUMERIC(6,2) NOT NULL DEFAULT 0;
