-- Separate authentication table for an unrelated desktop app.
-- This table is intentionally not connected to CRM students, teachers, centers, or payments.

CREATE TABLE IF NOT EXISTS desktop_app_users (
    desktop_user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    subscription_activated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_desktop_app_users_username ON desktop_app_users(username);
CREATE INDEX IF NOT EXISTS idx_desktop_app_users_status ON desktop_app_users(status);
