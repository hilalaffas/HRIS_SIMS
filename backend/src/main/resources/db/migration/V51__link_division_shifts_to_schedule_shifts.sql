ALTER TABLE shifts ADD COLUMN division_id BIGINT REFERENCES divisi(id) ON DELETE CASCADE;
ALTER TABLE divisi_shifts ADD COLUMN schedule_shift_id BIGINT REFERENCES shifts(shift_id) ON DELETE SET NULL;

CREATE INDEX idx_shifts_division ON shifts(division_id, display_order);
