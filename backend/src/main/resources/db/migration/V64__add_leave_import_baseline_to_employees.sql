-- ============================================================
-- V64__add_leave_import_baseline_to_employees.sql
--
-- Tujuan:
--   Menyimpan angka cuti hasil IMPORT Excel (ledger cuti) apa adanya per karyawan,
--   supaya "Ringkasan Cuti" untuk karyawan yang sudah diimport murni mengikuti Excel
--   (bukan dihitung ulang dari kuota x tahun kerja).
--
-- Kolom (semua NULL = karyawan belum pernah diimport -> perilaku lama, dihitung sistem):
--   import_total_leave     : total cuti = sisa + terpakai + hangus (dari Excel)
--   import_used_leave      : cuti terpakai (jumlah baris yang memotong jatah di Excel)
--   import_forfeited_leave : cuti hangus/expired (baris "hangus/expired" di Excel)
--   import_remaining_leave : sisa cuti (baris 2 di Excel)
--   leave_import_baseline_at : waktu import. Pengajuan cuti BARU (bukan riwayat import) yang
--                              disetujui setelah waktu ini dihitung dengan logika sistem
--                              di atas angka Excel.
--
-- Catatan: idempotent (IF NOT EXISTS), data lama tidak berubah.
-- ============================================================

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS import_total_leave       NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS import_used_leave        NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS import_forfeited_leave   NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS import_remaining_leave   NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS leave_import_baseline_at TIMESTAMP;
