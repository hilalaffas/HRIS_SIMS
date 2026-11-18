-- [BARU] Jam kerja divisi REGULAR yang dapat diatur.
--   * regular_start_time / regular_end_time : jam kerja dasar (default 08:00 - 17:00).
--   * divisi_day_schedules                  : jadwal KHUSUS per hari (Senin-Jumat) yang
--     menimpa jam dasar, lengkap dengan jam istirahat. Contoh: Jumat 08:00, istirahat
--     11:30-13:00, pulang 17:30.
-- Divisi lama otomatis tetap 08:00 - 17:00 tanpa jadwal khusus (perilaku sebelumnya).
ALTER TABLE divisi
    ADD COLUMN regular_start_time VARCHAR(5) NOT NULL DEFAULT '08:00',
    ADD COLUMN regular_end_time   VARCHAR(5) NOT NULL DEFAULT '17:00';

CREATE TABLE divisi_day_schedules (
    id               BIGSERIAL PRIMARY KEY,
    divisi_id        BIGINT      NOT NULL REFERENCES divisi(id) ON DELETE CASCADE,
    day_of_week      SMALLINT    NOT NULL,
    start_time       VARCHAR(5)  NOT NULL,
    break_start_time VARCHAR(5)  NOT NULL,
    break_end_time   VARCHAR(5)  NOT NULL,
    end_time         VARCHAR(5)  NOT NULL,
    CONSTRAINT chk_divisi_day_of_week CHECK (day_of_week BETWEEN 1 AND 5),
    CONSTRAINT uq_divisi_day UNIQUE (divisi_id, day_of_week)
);

CREATE INDEX idx_divisi_day_schedules_divisi ON divisi_day_schedules(divisi_id);
