-- [BARU] Pengajuan koreksi keterlambatan absensi beserta tahapan persetujuannya.
-- Catatan: di branch absensi file ini bernomor V57; dinomori ulang menjadi V61
-- dan dibuat idempoten (IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS attendance_corrections (
    correction_id BIGSERIAL PRIMARY KEY,
    attendance_id BIGINT NOT NULL UNIQUE REFERENCES attendances(attendance_id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES employees(employee_id),
    attendance_date DATE NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    review_note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_employee_date
    ON attendance_corrections(employee_id, attendance_date DESC);

CREATE TABLE IF NOT EXISTS attendance_correction_approvals (
    approval_id BIGSERIAL PRIMARY KEY,
    correction_id BIGINT NOT NULL REFERENCES attendance_corrections(correction_id) ON DELETE CASCADE,
    approver_role VARCHAR(30) NOT NULL,
    approver_employee_id BIGINT NOT NULL REFERENCES employees(employee_id),
    action VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    note VARCHAR(500),
    acted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_correction_approver
    ON attendance_correction_approvals(approver_employee_id, action);
