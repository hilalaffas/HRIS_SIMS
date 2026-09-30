-- Master jam kerja shift (bisa diubah jamnya oleh admin).
CREATE TABLE shifts (
    shift_id      BIGSERIAL PRIMARY KEY,
    code          VARCHAR(20)  NOT NULL UNIQUE,
    name          VARCHAR(100) NOT NULL,
    start_time    TIME         NOT NULL,
    end_time      TIME         NOT NULL,
    display_order INT          NOT NULL DEFAULT 0
);

INSERT INTO shifts (code, name, start_time, end_time, display_order) VALUES
    ('SHIFT_1', 'Shift 1 (Pagi)',        '07:00', '15:00', 1),
    ('SHIFT_2', 'Shift 2 (Siang)',       '15:00', '23:00', 2),
    ('NORMAL',  'Shift Normal (Office)', '08:00', '17:00', 3);

-- Jadwal kerja bulanan per karyawan per tanggal.
-- shift_id NULL = OFF / LIBUR.
CREATE TABLE work_schedules (
    schedule_id  BIGSERIAL PRIMARY KEY,
    employee_id  BIGINT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    work_date    DATE   NOT NULL,
    shift_id     BIGINT REFERENCES shifts(shift_id),
    published_by VARCHAR(100),
    published_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_work_schedule UNIQUE (employee_id, work_date)
);

CREATE INDEX idx_work_schedules_date ON work_schedules(work_date);
