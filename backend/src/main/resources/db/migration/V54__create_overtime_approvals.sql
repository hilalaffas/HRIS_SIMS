-- Store the selected approver and the decision independently for each overtime stage.
CREATE TABLE overtime_approvals (
    approval_id BIGSERIAL PRIMARY KEY,
    overtime_id BIGINT NOT NULL REFERENCES overtime_requests(overtime_id) ON DELETE CASCADE,
    approver_role VARCHAR(50) NOT NULL,
    approver_employee_id BIGINT NOT NULL REFERENCES employees(employee_id),
    action VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    note TEXT,
    acted_at TIMESTAMP,

    CONSTRAINT chk_overtime_approvals_role
        CHECK (approver_role IN ('LEADER', 'SPV', 'MANAGER')),
    CONSTRAINT chk_overtime_approvals_action
        CHECK (action IN ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED')),
    CONSTRAINT uq_overtime_approval_stage UNIQUE (overtime_id, approver_role)
);

CREATE INDEX idx_overtime_approvals_approver_action
    ON overtime_approvals (approver_employee_id, action);

CREATE INDEX idx_overtime_approvals_overtime
    ON overtime_approvals (overtime_id);

COMMENT ON TABLE overtime_approvals IS
    'Assigned approvers and per-stage decisions for overtime requests';
