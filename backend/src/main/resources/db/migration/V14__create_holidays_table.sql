CREATE TABLE holidays (
    holiday_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL UNIQUE,
    description VARCHAR(255),
    is_national BOOLEAN NOT NULL DEFAULT true,
    created_by BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);