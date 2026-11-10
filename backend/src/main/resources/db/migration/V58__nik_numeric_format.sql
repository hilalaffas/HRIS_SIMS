-- ============================================================
-- V58__nik_numeric_format.sql
--
-- Tujuan:
--   Mengubah format NIK karyawan dari "SYS-{tahun masuk}-{4 digit urut}"
--   (contoh SYS-2024-0012) menjadi angka urut murni 4 digit
--   (0001, 0002, ..., 0012, 0212, 2323).
--
-- Dasar angka: kolom nik_urut (sudah ada sejak V30, diisi sequence
-- nik_karyawan_seq). Kolom nik_karyawan_formatted (V30) pun sudah
-- LPAD(nik_urut, 4, '0'), jadi hasilnya identik.
--
-- Langkah:
--   1. Rapikan nik_urut yang kembar. Dulu NIK unik per teks penuh, jadi
--      SYS-2024-0012 dan SYS-2025-0012 boleh ada bersamaan (nik_urut sama).
--      Setelah jadi angka murni, keduanya akan bentrok. Karyawan dengan
--      employee_id paling kecil mempertahankan nomornya; yang lain mendapat
--      nomor baru dari sequence (dicatat lewat RAISE NOTICE).
--   2. Isi ulang nik_karyawan = LPAD(nik_urut, 4, '0').
--   3. Ganti fungsi trigger supaya INSERT baru memakai format angka.
--   4. Tambah CHECK (NOT VALID: hanya berlaku untuk baris baru/diubah,
--      data lama tidak diperiksa ulang sehingga migrasi tidak gagal).
--
-- CATATAN: ubah angka NIK tidak memengaruhi relasi apa pun (cuti, absensi,
-- lembur memakai employee_id). Tidak bisa dibalik otomatis -- bila ingin
-- rollback, simpan dulu hasil: SELECT employee_id, nik_karyawan FROM employees;
-- ============================================================

-- ---------- 1. Rapikan nik_urut yang kembar ----------
DO $$
DECLARE
    dup RECORD;
    candidate BIGINT;
BEGIN
    FOR dup IN
        SELECT employee_id, nik_urut
        FROM (
            SELECT employee_id,
                   nik_urut,
                   ROW_NUMBER() OVER (PARTITION BY nik_urut ORDER BY employee_id) AS rn
            FROM employees
            WHERE nik_urut IS NOT NULL
        ) ranked
        WHERE rn > 1
    LOOP
        LOOP
            candidate := nextval('nik_karyawan_seq');
            EXIT WHEN NOT EXISTS (SELECT 1 FROM employees WHERE nik_urut = candidate);
        END LOOP;

        UPDATE employees SET nik_urut = candidate WHERE employee_id = dup.employee_id;
        RAISE NOTICE 'NIK kembar: employee_id % dipindah dari nomor % ke nomor %',
            dup.employee_id, dup.nik_urut, candidate;
    END LOOP;
END $$;

-- ---------- 2. Isi ulang nik_karyawan dengan angka urut murni ----------
UPDATE employees
SET nik_karyawan = LPAD(nik_urut::text, 4, '0')
WHERE nik_urut IS NOT NULL;

-- ---------- 3. Trigger INSERT: format baru ----------
CREATE OR REPLACE FUNCTION generate_nik_karyawan()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.nik_urut IS NULL THEN
        NEW.nik_urut := nextval('nik_karyawan_seq');
    END IF;

    IF NEW.nik_karyawan IS NULL THEN
        NEW.nik_karyawan := LPAD(NEW.nik_urut::text, 4, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- 4. Penjaga format (hanya baris baru / yang diubah) ----------
ALTER TABLE employees DROP CONSTRAINT IF EXISTS chk_employees_nik_numeric;
ALTER TABLE employees
    ADD CONSTRAINT chk_employees_nik_numeric
    CHECK (nik_karyawan IS NULL OR nik_karyawan ~ '^[0-9]{4,6}$') NOT VALID;
