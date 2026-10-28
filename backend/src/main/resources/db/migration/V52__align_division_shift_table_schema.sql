ALTER TABLE divisi_shifts RENAME TO shift_divisi;
ALTER TABLE shift_divisi RENAME COLUMN id TO id_shift;
ALTER TABLE shift_divisi RENAME COLUMN divisi_id TO id_divisi;
ALTER TABLE shift_divisi RENAME COLUMN name TO nama_shift;
ALTER TABLE shift_divisi RENAME COLUMN start_time TO jam_masuk;
ALTER TABLE shift_divisi RENAME COLUMN end_time TO jam_pulang;

ALTER INDEX idx_divisi_shifts_divisi RENAME TO idx_shift_divisi_owner;
