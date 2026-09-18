-- ============================================================
-- V33__fix_half_day_leave_total_days.sql
--
-- Tujuan:
--   Memperbaiki data historis leave_requests untuk jenis cuti
--   "Cuti setengah hari" yang total_days-nya masih tersimpan 1
--   (hari penuh), bukan 0.5 seperti seharusnya.
--
-- Kenapa ini perlu:
--   Sisa Cuti yang ditampilkan di halaman ApplyCuti sudah BENAR
--   (10 hari) karena frontend punya patch koreksi sementara
--   (lihat legacyHalfDayCorrection di ApplyCuti.jsx) yang
--   membandingkan durasi yang ditampilkan (0,5 hari, dari nama
--   jenis cuti) dengan total_days mentah dari backend (masih 1).
--   Tapi Dashboard & Direktori Karyawan TIDAK memakai patch itu --
--   keduanya menampilkan LeaveBalanceResponse apa adanya dari
--   LeaveService.getLeaveBalance(), sehingga saldo tahunan
--   terpotong 1 hari penuh (bukan 0,5) untuk tiap baris "Cuti
--   setengah hari" yang datanya masih salah, dan hasilnya beda
--   dengan ApplyCuti (9 vs 10).
--
--   Migrasi ini menyamakan total_days di DATABASE ke 0.5 untuk
--   semua baris "Cuti setengah hari" yang belum 0.5, supaya
--   ApplyCuti, Dashboard, dan Direktori Karyawan konsisten
--   memakai satu sumber data yang sama-sama benar -- tanpa perlu
--   patch tambahan di frontend.
--
--   Sama seperti V21 (yang dulu melakukan koreksi serupa saat
--   half-day pertama kali didukung), tapi baris yang diperbaiki
--   V33 ini dibuat/diedit SETELAH V21 lewat alur lain (mis. Cuti
--   Susulan/HR) sehingga sempat lolos dari koreksi V21.
--
-- Catatan:
--   - Idempoten: WHERE total_days <> 0.5 membuat migrasi ini
--     aman dijalankan ulang tanpa efek samping kalau datanya
--     sudah benar.
--   - Tidak menyentuh leave_requests.manual_leave_days atau
--     employees.manual_leave_balance -- pada kasus yang ditemukan,
--     saldo Sisa Cuti (lama/manual) karyawan terkait masih 0
--     sehingga porsi manual yang terlanjur dipotong juga 0
--     (lihat LeaveService.allocateManualLeaveOnApproval).
-- ============================================================
UPDATE leave_requests lr
SET total_days = 0.5
FROM leave_types lt
WHERE lr.leave_type_id = lt.leave_type_id
  AND LOWER(lt.name) = LOWER('Cuti setengah hari')
  AND lr.total_days <> 0.5;
