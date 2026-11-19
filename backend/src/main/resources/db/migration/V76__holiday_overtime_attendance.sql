ALTER TABLE attendances
    ADD COLUMN holiday_overtime BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN holiday_overtime_start TIMESTAMP,
    ADD COLUMN holiday_overtime_end TIMESTAMP;
ALTER TABLE overtime_requests ADD COLUMN holiday_attendance_required BOOLEAN NOT NULL DEFAULT FALSE;
