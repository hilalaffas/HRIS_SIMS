-- Tahap persetujuan HRD: approver_role boleh bernilai 'HRD' (pengajuan baru memakai satu tahap HRD,
-- baris lama LEADER/SPV/MANAGER tetap valid sampai pengajuan lamanya selesai).
-- leave_request_approvals & attendance_correction_approvals tidak punya CHECK pada approver_role.
ALTER TABLE overtime_approvals DROP CONSTRAINT IF EXISTS chk_overtime_approvals_role;
ALTER TABLE overtime_approvals
    ADD CONSTRAINT chk_overtime_approvals_role
        CHECK (approver_role IN ('LEADER', 'SPV', 'MANAGER', 'HRD'));
