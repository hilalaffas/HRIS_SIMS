-- Menambahkan kolom "position" (jabatan) pada tabel employees.
-- Sebelumnya frontend (FormKaryawan.jsx & ModalDetailKaryawan.jsx) SUDAH
-- mengirim/menampilkan field jabatan, tapi backend belum punya kolomnya
-- sama sekali sehingga data jabatan tidak pernah tersimpan.
ALTER TABLE employees
ADD COLUMN position VARCHAR(100);
