-- Ubah HRD menjadi HRD_Admin
UPDATE roles
SET role_name = 'HRD_Admin'
WHERE role_id = 2;

-- Ubah Leader menjadi HRD_Karyawan
UPDATE roles
SET role_name = 'HRD_Karyawan'
WHERE role_id = 3;

-- Ubah Member menjadi Leader
UPDATE roles
SET role_name = 'Leader'
WHERE role_id = 6;

-- Tambah Member baru
INSERT INTO roles (role_name)
VALUES ('Member');