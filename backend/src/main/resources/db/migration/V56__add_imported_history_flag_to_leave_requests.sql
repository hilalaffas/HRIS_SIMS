-- ============================================================
-- V56__add_imported_history_flag_to_leave_requests.sql
--
-- Tujuan:
--   Menandai catatan cuti yang berasal dari IMPORT riwayat (ledger cuti lama,
--   satu baris per tanggal) dengan kolom is_imported_history.
--
-- Kenapa perlu penanda:
--   Riwayat ledger mencakup bertahun-tahun (puluhan sampai ratusan hari per
--   karyawan). Kalau ikut dihitung oleh LeaveService.getLeaveBalance, kuota
--   12 hari/periode dan defisit yang dibawa ke periode berikutnya jadi kacau.
--   Sisa cuti karyawan diatur lewat fitur sisa cuti lama / tahun berjalan
--   (/devAccess), jadi baris bertanda TRUE hanya dipakai untuk tampilan riwayat,
--   laporan absensi, dan pengecekan tanggal bentrok -- TIDAK mengurangi saldo.
--
-- Catatan: default FALSE, semua data yang ada tidak berubah. Idempotent.
-- ============================================================

ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS is_imported_history BOOLEAN NOT NULL DEFAULT FALSE;
