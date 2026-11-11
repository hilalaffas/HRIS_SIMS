-- [BARU] Index performa. PostgreSQL TIDAK otomatis membuat index untuk foreign key, sehingga
-- query yang memfilter kolom di bawah ini memindai seluruh tabel. Hanya menambah index:
-- tidak mengubah data, kolom, maupun logic. IF NOT EXISTS membuat migration aman dijalankan ulang.

-- Riwayat cuti per karyawan (Histori Cuti, Ringkasan Cuti, saldo cuti, kalender)
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_start
    ON leave_requests (employee_id, start_date DESC);

-- Filter status (PENDING/APPROVED) pada daftar & kalender cuti
CREATE INDEX IF NOT EXISTS idx_leave_requests_status
    ON leave_requests (status_id);

-- Tugas approval milik atasan (badge lonceng/sidebar yang di-polling)
CREATE INDEX IF NOT EXISTS idx_leave_request_approvals_approver_action
    ON leave_request_approvals (approver_employee_id, action);

-- Relasi karyawan -> divisi / user (daftar karyawan, pencarian approver per divisi)
CREATE INDEX IF NOT EXISTS idx_employees_divisi
    ON employees (divisi_id);
CREATE INDEX IF NOT EXISTS idx_employees_user
    ON employees (user_id);

-- Log Sistem diurutkan/difilter berdasarkan waktu
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
    ON activity_logs (created_at DESC);
