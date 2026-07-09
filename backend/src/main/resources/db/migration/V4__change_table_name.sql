-- =====================
-- RENAME TABEL
-- =====================
ALTER TABLE karyawan RENAME TO employees;
ALTER TABLE jenis_cuti RENAME TO leave_types;
ALTER TABLE status_cuti RENAME TO leave_statuses;
ALTER TABLE cuti RENAME TO leave_requests;

-- =====================
-- RENAME KOLOM roles
-- =====================
ALTER TABLE roles RENAME COLUMN id_role TO role_id;
ALTER TABLE roles RENAME COLUMN nama_role TO role_name;

-- =====================
-- RENAME KOLOM users
-- =====================
ALTER TABLE users RENAME COLUMN id_user TO user_id;
ALTER TABLE users RENAME COLUMN id_role TO role_id;

-- =====================
-- RENAME KOLOM employees (dulunya karyawan)
-- =====================
ALTER TABLE employees RENAME COLUMN id_karyawan TO employee_id;
ALTER TABLE employees RENAME COLUMN id_user TO user_id;
ALTER TABLE employees RENAME COLUMN nama_karyawan TO full_name;
ALTER TABLE employees RENAME COLUMN alamat TO address;
ALTER TABLE employees RENAME COLUMN nomer_handphone TO phone_number;
ALTER TABLE employees RENAME COLUMN jenis_kelamin TO gender;
ALTER TABLE employees RENAME COLUMN tanggal_masuk TO join_date;
ALTER TABLE employees RENAME COLUMN status TO is_active;

-- =====================
-- RENAME KOLOM leave_types (dulunya jenis_cuti)
-- =====================
ALTER TABLE leave_types RENAME COLUMN id_jenis TO leave_type_id;
ALTER TABLE leave_types RENAME COLUMN nama_jenis TO name;

-- =====================
-- RENAME KOLOM leave_statuses (dulunya status_cuti)
-- =====================
ALTER TABLE leave_statuses RENAME COLUMN id_status TO status_id;
ALTER TABLE leave_statuses RENAME COLUMN nama_status TO status_name;

-- =====================
-- RENAME KOLOM leave_requests (dulunya cuti)
-- =====================
ALTER TABLE leave_requests RENAME COLUMN id_cuti TO leave_request_id;
ALTER TABLE leave_requests RENAME COLUMN id_karyawan TO employee_id;
ALTER TABLE leave_requests RENAME COLUMN id_status TO status_id;
ALTER TABLE leave_requests RENAME COLUMN id_jenis TO leave_type_id;
ALTER TABLE leave_requests RENAME COLUMN start_tanggal TO start_date;
ALTER TABLE leave_requests RENAME COLUMN end_tanggal TO end_date;
ALTER TABLE leave_requests RENAME COLUMN jumlah_hari TO total_days;
ALTER TABLE leave_requests RENAME COLUMN tanggal_pengajuan TO submitted_at;
ALTER TABLE leave_requests RENAME COLUMN tanggal_persetujuan TO approved_at;
ALTER TABLE leave_requests RENAME COLUMN tanggal_pengembalian TO returned_at;

ALTER TABLE leave_requests ADD COLUMN review_note VARCHAR(255);
