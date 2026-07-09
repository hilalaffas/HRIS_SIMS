INSERT INTO roles (nama_role) VALUES
('admin'),
('HRD'),
('Leader'),
('Manager'),
('SPV'),
('Member')
ON CONFLICT (nama_role) DO NOTHING;

INSERT INTO users (id_role, username, password, email)
VALUES (
    (SELECT id_role FROM roles WHERE nama_role = 'admin'),
    'admin',
    '$2a$10$B./MAOenqjvMpBuZKPt4Ge4V0oUnxLOW3SwYWJVisNZgSBl7REara',
    'admin@mail.com'
)
ON CONFLICT (username) DO NOTHING;