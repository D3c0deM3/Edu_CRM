-- Create tables for saving the database information only

CREATE TABLE edu_centers (
    center_id SERIAL PRIMARY KEY,
    center_name VARCHAR(255) NOT NULL,
    center_code VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    principal_name VARCHAR(100),
    teacher_class_warning_minutes INT DEFAULT 15,
    parent_payment_warning_days INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_center_code ON edu_centers(center_code);
