CREATE TABLE leave_request_approvals (
    approval_id BIGSERIAL PRIMARY KEY,
    leave_request_id BIGINT NOT NULL REFERENCES leave_requests(leave_request_id) ON DELETE CASCADE,
    approver_role VARCHAR(50) NOT NULL,
    approver_employee_id BIGINT REFERENCES employees(employee_id),
    action VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    note VARCHAR(255),
    acted_at TIMESTAMP,
    CONSTRAINT leave_request_approvals_unique_role UNIQUE (leave_request_id, approver_role),
    CONSTRAINT leave_request_approvals_action_check CHECK (action IN ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED'))
);

INSERT INTO leave_statuses (status_name)
SELECT 'PENDING'
WHERE NOT EXISTS (
    SELECT 1 FROM leave_statuses WHERE UPPER(status_name) = 'PENDING'
);

INSERT INTO leave_statuses (status_name)
SELECT 'APPROVED'
WHERE NOT EXISTS (
    SELECT 1 FROM leave_statuses WHERE UPPER(status_name) = 'APPROVED'
);

INSERT INTO leave_statuses (status_name)
SELECT 'REJECTED'
WHERE NOT EXISTS (
    SELECT 1 FROM leave_statuses WHERE UPPER(status_name) = 'REJECTED'
);

INSERT INTO leave_statuses (status_name)
SELECT 'RETURNED'
WHERE NOT EXISTS (
    SELECT 1 FROM leave_statuses WHERE UPPER(status_name) = 'RETURNED'
);

INSERT INTO roles (role_name)
SELECT 'SPV'
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE UPPER(role_name) = 'SPV'
);

INSERT INTO roles (role_name)
SELECT 'Manager'
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE UPPER(role_name) = 'MANAGER'
);

INSERT INTO roles (role_name)
SELECT 'SUPER_ADMIN'
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE UPPER(role_name) = 'SUPER_ADMIN'
);
