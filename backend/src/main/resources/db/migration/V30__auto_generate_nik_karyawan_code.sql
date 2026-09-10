-- ============================================================
-- Tujuan: nik_karyawan tidak lagi diinput manual, tapi otomatis
-- terisi format "SYS-{tahun masuk}-{4 digit urut}" (contoh:
-- SYS-2026-0005), mengikuti pola nik_karyawan_lama yang sudah
-- ada, dan otomatis juga untuk data yang sudah ada sebelumnya.
-- ============================================================

-- ============================================================
-- BAGIAN 1: Pindahkan nomor urut yang sekarang ada di
-- nik_karyawan (bigint, hasil V28/V29) ke kolom baru nik_urut.
-- Kolom nik_urut inilah yang jadi "sumber angka" permanen,
-- supaya nik_karyawan bisa diubah jadi TEXT untuk menyimpan
-- kode lengkap (SYS-YYYY-NNNN).
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS nik_urut BIGINT;

UPDATE employees
SET nik_urut = nik_karyawan
WHERE nik_urut IS NULL;

-- Pindahkan kepemilikan sequence dari nik_karyawan ke nik_urut,
-- dan jadikan nik_urut yang auto-increment (bukan nik_karyawan lagi).
ALTER SEQUENCE nik_karyawan_seq OWNED BY employees.nik_urut;
ALTER TABLE employees ALTER COLUMN nik_urut SET DEFAULT nextval('nik_karyawan_seq');

SELECT setval(
  'nik_karyawan_seq',
  (SELECT COALESCE(MAX(nik_urut), 0) FROM employees) + 1,
  false
);

-- ============================================================
-- BAGIAN 2: Ubah nik_karyawan jadi TEXT (nampung kode lengkap),
-- lepas default lama (nextval) yang sekarang sudah pindah ke
-- nik_urut.
-- ============================================================

ALTER TABLE employees ALTER COLUMN nik_karyawan DROP DEFAULT;
ALTER TABLE employees ALTER COLUMN nik_karyawan TYPE TEXT USING nik_karyawan::text;

-- ============================================================
-- BAGIAN 3: Migrasi data lama -> isi ulang nik_karyawan dengan
-- format SYS-{tahun masuk}-{4 digit nik_urut}. Kalau join_date
-- kosong, fallback ke tahun berjalan.
-- ============================================================

UPDATE employees
SET nik_karyawan = 'SYS-'
    || COALESCE(EXTRACT(YEAR FROM join_date)::text, to_char(CURRENT_DATE, 'YYYY'))
    || '-'
    || LPAD(nik_urut::text, 4, '0')
WHERE nik_urut IS NOT NULL;

-- Kode akhir harus unik (aman karena nik_urut sudah pasti unik per baris).
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_nik_karyawan_key;
ALTER TABLE employees ADD CONSTRAINT employees_nik_karyawan_key UNIQUE (nik_karyawan);

-- ============================================================
-- BAGIAN 4: Ganti kolom generated nik_karyawan_formatted supaya
-- ambil dari nik_urut (bukan nik_karyawan lagi, karena sekarang
-- isinya teks kode lengkap bukan angka murni).
-- ============================================================

ALTER TABLE employees DROP COLUMN IF EXISTS nik_karyawan_formatted;
ALTER TABLE employees
ADD COLUMN nik_karyawan_formatted text
GENERATED ALWAYS AS (LPAD(nik_urut::text, 4, '0')) STORED;

-- ============================================================
-- BAGIAN 5: Trigger -> otomatis isi nik_urut & nik_karyawan
-- setiap ada INSERT baru (dari aplikasi ATAU insert manual),
-- supaya pendaftaran karyawan baru tidak perlu input NIK lagi.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_nik_karyawan()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.nik_urut IS NULL THEN
        NEW.nik_urut := nextval('nik_karyawan_seq');
    END IF;

    IF NEW.nik_karyawan IS NULL THEN
        NEW.nik_karyawan := 'SYS-'
            || COALESCE(EXTRACT(YEAR FROM NEW.join_date)::text, to_char(CURRENT_DATE, 'YYYY'))
            || '-'
            || LPAD(NEW.nik_urut::text, 4, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_nik_karyawan ON employees;
CREATE TRIGGER trg_generate_nik_karyawan
BEFORE INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION generate_nik_karyawan();
