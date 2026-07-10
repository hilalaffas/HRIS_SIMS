-- 1. Hapus id 8 (SUPER_ADMIN)
DELETE FROM roles 
WHERE role_id = 8;

-- 2. Ubah id 1 dari 'admin' menjadi 'SUPER_ADMIN'
UPDATE roles 
SET role_name = 'SUPER_ADMIN' 
WHERE role_id = 1;