CREATE TABLE divisi (
    id BIGSERIAL PRIMARY KEY,
    nama_divisi VARCHAR(100) NOT NULL UNIQUE
);

ALTER TABLE employees ADD COLUMN divisi_id BIGINT;

ALTER TABLE employees 
    ADD CONSTRAINT fk_employee_divisi 
    FOREIGN KEY (divisi_id) REFERENCES divisi(id);