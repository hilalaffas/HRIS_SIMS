CREATE TABLE divisi_shifts (
    id BIGSERIAL PRIMARY KEY,
    divisi_id BIGINT NOT NULL REFERENCES divisi(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(5) NOT NULL,
    end_time VARCHAR(5) NOT NULL,
    display_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_divisi_shifts_divisi ON divisi_shifts(divisi_id, display_order);
