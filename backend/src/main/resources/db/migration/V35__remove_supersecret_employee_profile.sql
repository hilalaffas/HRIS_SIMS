-- ============================================================
-- V35__remove_supersecret_employee_profile.sql
--
-- Bug yang diperbaiki: LeaveService.getEmployeeByUsername() punya
-- fallback auto-create Employee (createEmployeeProfileForExistingUser)
-- untuk username manapun yang belum punya profil Employee saat
-- menyentuh endpoint cuti/approval apa pun (dipicu tanpa sengaja
-- oleh badge jumlah approval di Sidebar/Navbar). Ini membuat akun
-- 'supersecret' (lihat V34 -- SENGAJA dibuat TANPA Employee, supaya
-- tidak pernah muncul di halaman Karyawan) malah otomatis kebagian
-- baris Employee begitu login & membuka aplikasi.
--
-- Fix akarnya ada di LeaveService.createEmployeeProfileForExistingUser
-- (kode Java, menolak auto-create khusus untuk username 'supersecret').
-- Migration ini membersihkan baris yang SUDAH KETERLANJUR ter-create
-- akibat bug tsb, sebelum fix-nya di-deploy.
--
-- Aman dijalankan ulang (idempoten) -- kalau baris employees untuk
-- 'supersecret' sudah tidak ada (mis. di environment yang belum
-- pernah kena bug ini), DELETE ini tidak melakukan apa-apa.
-- ============================================================

DELETE FROM employees
WHERE user_id = (SELECT user_id FROM users WHERE username = 'supersecret');
