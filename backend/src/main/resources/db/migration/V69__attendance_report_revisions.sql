CREATE TABLE attendance_report_revisions (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(employee_id),
    date DATE NOT NULL,
    schedule_change BOOLEAN NOT NULL DEFAULT FALSE,
    before_shift VARCHAR(255),
    after_shift VARCHAR(255),
    before_status VARCHAR(255),
    after_status VARCHAR(255),
    before_note VARCHAR(2000),
    after_note VARCHAR(2000),
    reason VARCHAR(1000) NOT NULL,
    edited_by VARCHAR(255) NOT NULL,
    editor_name VARCHAR(255) NOT NULL,
    edited_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_report_revision_employee_date ON attendance_report_revisions(employee_id, date, id DESC);
