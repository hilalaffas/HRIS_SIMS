-- ============================================
-- Reassign ulang nik_karyawan supaya berurutan
-- sesuai urutan user_id (dari kecil ke besar)
-- ============================================

-- 1. Assign ulang SEMUA nik_karyawan, urut berdasarkan user_id
WITH ordered AS (
    SELECT employee_id,
           ROW_NUMBER() OVER (ORDER BY user_id) AS new_nik
    FROM employees
)
UPDATE employees e
SET nik_karyawan = o.new_nik
FROM ordered o
WHERE e.employee_id = o.employee_id;

-- 2. Sinkronin sequence biar nomor berikutnya (karyawan baru)
--    lanjut dari nomor terbesar yang baru saja di-assign
SELECT setval(
  'nik_karyawan_seq',
  (SELECT COALESCE(MAX(nik_karyawan), 0) FROM employees) + 1,
  false
);