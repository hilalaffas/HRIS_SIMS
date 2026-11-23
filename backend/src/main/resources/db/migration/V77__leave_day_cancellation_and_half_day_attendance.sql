CREATE TABLE leave_day_cancellations (
    leave_request_id BIGINT NOT NULL REFERENCES leave_requests(leave_request_id) ON DELETE CASCADE,
    cancelled_date DATE NOT NULL,
    cancelled_at TIMESTAMP NOT NULL,
    actor_id BIGINT NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    cancelled_days NUMERIC(6,2) NOT NULL CHECK (cancelled_days > 0),
    returned_manual_days NUMERIC(6,2) NOT NULL,
    returned_quota_days NUMERIC(6,2) NOT NULL,
    PRIMARY KEY (leave_request_id, cancelled_date)
);
INSERT INTO leave_statuses(status_name)
SELECT 'CANCELLED' WHERE NOT EXISTS (SELECT 1 FROM leave_statuses WHERE upper(status_name)='CANCELLED');
ALTER TABLE attendances
    ADD COLUMN scheduled_work_start TIMESTAMP,
    ADD COLUMN scheduled_work_end TIMESTAMP,
    ADD COLUMN scheduled_work_minutes INTEGER;
