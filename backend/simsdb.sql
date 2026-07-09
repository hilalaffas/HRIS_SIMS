-- ============================================
-- TABEL: employees
-- ============================================
CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    gender CHAR(1) NOT NULL CHECK (gender IN ('L', 'P')),
    role VARCHAR(20) NOT NULL CHECK (role IN ('STAFF', 'LEADER', 'SPV', 'MANAGER', 'HRD')),
    supervisor_id BIGINT REFERENCES employees(id),
    join_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================
-- TABEL: leave_types
-- ============================================
CREATE TABLE leave_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    default_quota INT NOT NULL DEFAULT 0,
    affects_quota BOOLEAN NOT NULL DEFAULT FALSE,
    min_advance_days INT NOT NULL DEFAULT 0,
    requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
    gender_restriction CHAR(1) CHECK (gender_restriction IN ('L', 'P'))
);

-- ============================================
-- TABEL: leave_balances
-- ============================================
CREATE TABLE leave_balances (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    leave_type_id BIGINT NOT NULL REFERENCES leave_types(id),
    year INT NOT NULL,
    quota INT NOT NULL,
    used INT NOT NULL DEFAULT 0,
    UNIQUE (employee_id, leave_type_id, year)
);

-- ============================================
-- TABEL: leave_requests
-- ============================================
CREATE TABLE leave_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    leave_type_id BIGINT NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT NOT NULL,
    reason VARCHAR(255),
    attachment_url VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED')),
    reviewed_by BIGINT REFERENCES employees(id),
    reviewed_at TIMESTAMP,
    review_note VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABEL: attendances
-- ============================================
CREATE TABLE attendances (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    date DATE NOT NULL,
    clock_in TIMESTAMP,
    clock_out TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    notes VARCHAR(255)
);

-- ============================================
-- SEED DATA: jenis cuti sesuai UU Ketenagakerjaan
-- ============================================
INSERT INTO leave_types (name, default_quota, affects_quota, min_advance_days, requires_attachment, gender_restriction) VALUES
('Cuti Tahunan',            12, TRUE,  5, FALSE, NULL),
('Cuti Urgent',              0, TRUE,  0, FALSE, NULL),
('Cuti Sakit',               0, FALSE, 0, TRUE,  NULL),
('Cuti Menikah',             3, FALSE, 0, TRUE,  NULL),
('Cuti Menikahkan Anak',     2, FALSE, 0, TRUE,  NULL),
('Cuti Khitan/Baptis Anak',  2, FALSE, 0, TRUE,  NULL),
('Cuti Istri Melahirkan',    2, FALSE, 0, TRUE,  'L'),
('Cuti Melahirkan',         90, FALSE, 0, TRUE,  'P'),
('Cuti Keguguran',          45, FALSE, 0, TRUE,  'P'),
('Cuti Duka Keluarga Inti',  2, FALSE, 0, FALSE, NULL),
('Cuti Duka Satu Rumah',     1, FALSE, 0, FALSE, NULL),
('Cuti Haji/Umrah',         50, FALSE, 0, TRUE,  NULL),
('Cuti Haid',                2, FALSE, 0, FALSE, 'P');