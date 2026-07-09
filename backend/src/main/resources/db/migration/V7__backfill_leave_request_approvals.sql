INSERT INTO leave_request_approvals (leave_request_id, approver_role, action)
SELECT lr.leave_request_id, roles.approver_role, 'PENDING'
FROM leave_requests lr
CROSS JOIN (
    VALUES ('LEADER'), ('SPV'), ('MANAGER')
) AS roles(approver_role)
WHERE NOT EXISTS (
    SELECT 1
    FROM leave_request_approvals lra
    WHERE lra.leave_request_id = lr.leave_request_id
      AND lra.approver_role = roles.approver_role
);
