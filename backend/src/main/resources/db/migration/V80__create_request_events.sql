-- [BARU] Jejak request HTTP untuk panel Monitoring akun dev (/devAccess -> tab Monitoring).
-- Yang disimpan hanya kejadian penting: request yang MENGUBAH data (POST/PUT/PATCH/DELETE),
-- request GAGAL (status >= 400) dan request LAMBAT (>= monitoring.slow-threshold-ms).
-- Isi request (body), query string, token, dan sandi TIDAK PERNAH disimpan.
-- Baris dihapus otomatis oleh RequestEventCleanupScheduler (default 14 hari).
CREATE TABLE IF NOT EXISTS request_events (
    event_id      BIGSERIAL PRIMARY KEY,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    username      VARCHAR(50),
    method        VARCHAR(10)  NOT NULL,
    route         VARCHAR(200),
    path          VARCHAR(300) NOT NULL,
    status        INTEGER      NOT NULL,
    duration_ms   INTEGER      NOT NULL,
    ip_address    VARCHAR(50),
    error_message VARCHAR(400)
);

CREATE INDEX IF NOT EXISTS idx_request_events_created ON request_events (created_at DESC, event_id DESC);
