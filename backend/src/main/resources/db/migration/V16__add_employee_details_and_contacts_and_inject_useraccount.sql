CREATE TABLE emergency_contact_relationships (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO emergency_contact_relationships (name) VALUES 
('Orang Tua'), 
('Suami / Istri'), 
('Anak'), 
('Saudara Kandung'), 
('Lainnya');

ALTER TABLE employees
ADD COLUMN nik_karyawan VARCHAR(50),
ADD COLUMN photo VARCHAR(255),
ADD COLUMN emergency_contact_name VARCHAR(100),
ADD COLUMN emergency_contact_phone VARCHAR(20),
ADD COLUMN emergency_contact_relationship_id INT REFERENCES emergency_contact_relationships(id);


INSERT INTO users (role_id, username, password, email)
VALUES (
    (SELECT role_id FROM roles WHERE role_name = 'admin'),
    'SUPERADMIN',
    '$2a$10$zR2XS6Ch3EBZ1Vg14xFu3.6cKzY2aebrnrt3r6rf6Ss/nHRtub53K',
    'superadmin@mail.com'
)
ON CONFLICT (username) DO NOTHING;
INSERT INTO users (role_id, username, password, email)
VALUES (
    (SELECT role_id FROM roles WHERE role_name = 'HRD_Admin'),
    'HRD_Admin',
    '$2a$10$zR2XS6Ch3EBZ1Vg14xFu3.6cKzY2aebrnrt3r6rf6Ss/nHRtub53K',
    'hrd_admin@mail.com'
)
ON CONFLICT (username) DO NOTHING;
INSERT INTO users (role_id, username, password, email)
VALUES (
    (SELECT role_id FROM roles WHERE role_name = 'HRD_Karyawan'),
    'HRD_Karyawan',
    '$2a$10$zR2XS6Ch3EBZ1Vg14xFu3.6cKzY2aebrnrt3r6rf6Ss/nHRtub53K',
    'hrd_karyawan@mail.com'
)
ON CONFLICT (username) DO NOTHING;
INSERT INTO users (role_id, username, password, email)
VALUES (
    (SELECT role_id FROM roles WHERE role_name = 'Manager'),
    'Manager',
    '$2a$10$zR2XS6Ch3EBZ1Vg14xFu3.6cKzY2aebrnrt3r6rf6Ss/nHRtub53K',
    'manager@mail.com'
)
ON CONFLICT (username) DO NOTHING;
INSERT INTO users (role_id, username, password, email)
VALUES (
    (SELECT role_id FROM roles WHERE role_name = 'SPV'),
    'SPV',
    '$2a$10$zR2XS6Ch3EBZ1Vg14xFu3.6cKzY2aebrnrt3r6rf6Ss/nHRtub53K',
    'spv@mail.com'
)
ON CONFLICT (username) DO NOTHING;
INSERT INTO users (role_id, username, password, email)
VALUES (
    (SELECT role_id FROM roles WHERE role_name = 'Leader'),
    'Leader',
    '$2a$10$zR2XS6Ch3EBZ1Vg14xFu3.6cKzY2aebrnrt3r6rf6Ss/nHRtub53K',
    'leader@mail.com'
)
ON CONFLICT (username) DO NOTHING;
INSERT INTO users (role_id, username, password, email)
VALUES (
    (SELECT role_id FROM roles WHERE role_name = 'Member'),
    'Member',
    '$2a$10$zR2XS6Ch3EBZ1Vg14xFu3.6cKzY2aebrnrt3r6rf6Ss/nHRtub53K',
    'member@mail.com'
)
ON CONFLICT (username) DO NOTHING;