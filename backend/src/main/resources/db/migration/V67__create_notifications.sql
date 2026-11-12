-- [BARU] Notifikasi lonceng disimpan di database (sebelumnya dihitung ulang di browser
-- dan status "dibaca"-nya hanya ada di localStorage, sehingga notifikasi muncul lagi di
-- perangkat/browser lain). read_at NULL = belum dibaca. Baris dihapus otomatis oleh
-- NotificationCleanupScheduler setelah masa simpan (default 2 bulan).
CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    type            VARCHAR(40) NOT NULL,
    reference_id    BIGINT,
    params          TEXT,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMP
);

-- Daftar notifikasi per penerima (terbaru dulu) + hitungan belum dibaca
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC, notification_id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id) WHERE read_at IS NULL;
-- Dipakai job pembersihan berkala
CREATE INDEX IF NOT EXISTS idx_notifications_created
    ON notifications (created_at);
