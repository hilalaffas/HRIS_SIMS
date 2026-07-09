CREATE TABLE activity_logs (
    log_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    username VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50),
    entity_id BIGINT,
    description TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);