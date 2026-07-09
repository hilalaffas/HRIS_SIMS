CREATE TABLE password_reset_requests (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(user_id),

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    approved_by BIGINT
        REFERENCES users(user_id),

    approved_at TIMESTAMP,

    notes VARCHAR(255)
);