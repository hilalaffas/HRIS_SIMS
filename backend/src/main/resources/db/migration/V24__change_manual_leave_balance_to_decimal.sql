-- [BARU] Ubah manual_leave_balance dari INTEGER ke NUMERIC(6,2).
--
-- Alasan: kolom ini adalah alokasi AWAL "Sisa Cuti" yang diisi manual oleh
-- HR (lihat V23__add_manual_leave_balance_to_employees.sql). Selama ini
-- HR cuma bisa isi bilangan bulat (mis. 2), padahal semua perhitungan
-- sisa cuti di LeaveService.getLeaveBalance() sudah pakai BigDecimal dan
-- mendukung nilai desimal (misal 0,5 hari untuk Cuti Setengah Hari,
-- lihat V21__support_half_day_leave.sql). Dengan migration ini, HR bisa
-- isi alokasi awal dengan angka pecahan bebas 2 digit desimal (mis. 2,25),
-- bukan cuma kelipatan tertentu.
--
-- NUMERIC(6,2) dipilih supaya cukup untuk kasus wajar (maks 9999,99 hari)
-- sekaligus konsisten dengan presisi 2 desimal yang dipakai di seluruh
-- aplikasi. Data lama (bilangan bulat) otomatis ikut ter-cast, tidak ada
-- data yang hilang.
ALTER TABLE employees
ALTER COLUMN manual_leave_balance TYPE NUMERIC(6, 2) USING manual_leave_balance::numeric(6, 2);
