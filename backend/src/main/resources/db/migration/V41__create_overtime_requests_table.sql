-- [BARU] Tabel Pengajuan Lembur -- sumber data kolom "Lembur" di tabel
-- Jadwal & Log Absensi Bulanan (halaman Absensi). Terhubung ke employees
-- seperti attendances & leave_requests.
CREATE TABLE overtime_requests (
    overtime_id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(employee_id),

    -- Tanggal lembur & rentang jam (lembur tidak melewati tengah malam)
    overtime_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Dihitung backend dari start_time & end_time, BUKAN input user
    total_minutes INTEGER NOT NULL,

    reason VARCHAR(500) NOT NULL,

    -- 'PENDING', 'APPROVED', atau 'REJECTED'
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_overtime_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_overtime_employee_date ON overtime_requests(employee_id, overtime_date DESC);

COMMENT ON COLUMN overtime_requests.status IS 'PENDING, APPROVED, atau REJECTED';
COMMENT ON COLUMN overtime_requests.total_minutes IS 'Durasi lembur dalam menit, dihitung backend';
