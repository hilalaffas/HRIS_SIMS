-- ============================================
-- BAGIAN 1: Pisahin NIK yang masih ada hurufnya
-- ============================================

-- 1. Cek dulu, siapa aja yang NIK-nya masih ada hurufnya
SELECT employee_id, full_name, nik_karyawan
FROM employees
WHERE nik_karyawan IS NOT NULL
  AND nik_karyawan !~ '^[0-9]+$';

-- 2. Bikin kolom arsip buat nyimpen NIK lama (format lama, apa adanya)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nik_karyawan_lama character varying(50);

-- 3. Pindahin NIK yang ada hurufnya ke kolom arsip
UPDATE employees
SET nik_karyawan_lama = nik_karyawan
WHERE nik_karyawan IS NOT NULL
  AND nik_karyawan !~ '^[0-9]+$';

-- 4. Kosongin nik_karyawan yang masih ada hurufnya
UPDATE employees
SET nik_karyawan = NULL
WHERE nik_karyawan IS NOT NULL
  AND nik_karyawan !~ '^[0-9]+$';


-- ============================================
-- BAGIAN 2: Cek duplikat sebelum convert ke bigint
-- ============================================

-- 5. Cek apakah ada NIK beda secara teks tapi sama kalau dicast ke angka
SELECT nik_karyawan::bigint AS nik_angka, COUNT(*), array_agg(nik_karyawan) AS versi_asli
FROM employees
WHERE nik_karyawan IS NOT NULL
  AND nik_karyawan ~ '^[0-9]+$'
GROUP BY nik_karyawan::bigint
HAVING COUNT(*) > 1;

-- >>> STOP DI SINI DULU 
-- Kalau ada hasilnya, beresin duplikatnya manual dulu sebelum lanjut.


-- ============================================
-- BAGIAN 3: Convert ke bigint + setup auto increment
-- ============================================

-- 6. Ubah tipe kolom jadi bigint (skip kalau udah bigint)
ALTER TABLE employees
ALTER COLUMN nik_karyawan TYPE bigint
USING nik_karyawan::bigint;

-- 7. Bikin sequence (drop dulu kalau udah pernah ada, biar gak error)
DROP SEQUENCE IF EXISTS nik_karyawan_seq;
CREATE SEQUENCE nik_karyawan_seq;
SELECT setval(
  'nik_karyawan_seq', 
  COALESCE((SELECT MAX(nik_karyawan) FROM employees), 0) + 1, 
  false
);

-- 8. Isi baris yang NULL pakai nomor dari sequence, urut sesuai employee_id
UPDATE employees e
SET nik_karyawan = t.new_nik
FROM (
  SELECT employee_id,
         (SELECT COALESCE(MAX(nik_karyawan), 0) FROM employees) 
           + ROW_NUMBER() OVER (ORDER BY employee_id) AS new_nik
  FROM employees
  WHERE nik_karyawan IS NULL
) t
WHERE e.employee_id = t.employee_id;

-- 9. Sinkronin sequence biar lanjut dari nomor terbaru (setelah step 8)
SELECT setval(
  'nik_karyawan_seq', 
  (SELECT MAX(nik_karyawan) FROM employees) + 1, 
  false
);

-- 10. Set default kolom pakai sequence, biar insert baru otomatis ke-generate
ALTER TABLE employees
ALTER COLUMN nik_karyawan SET DEFAULT nextval('nik_karyawan_seq');

-- 11. Hubungin sequence ke kolom
ALTER SEQUENCE nik_karyawan_seq OWNED BY employees.nik_karyawan;


-- ============================================
-- BAGIAN 4: Format tampilan jadi 4 digit (0001, 0002, dst)
-- ============================================

-- 12. Bikin kolom generated yang otomatis format dari nik_karyawan
ALTER TABLE employees
ADD COLUMN nik_karyawan_formatted text
GENERATED ALWAYS AS (LPAD(nik_karyawan::text, 4, '0')) STORED;