-- Create a table for saving the superuser data

CREATE TYPE superuser_status AS ENUM('Active', 'Inactive', 'Suspended');

CREATE TABLE superusers (
    superuser_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(100) DEFAULT 'Admin',
    permissions JSONB,
    status superuser_status DEFAULT 'Active',
    last_login TIMESTAMP,
    login_attempts INT DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
);

CREATE INDEX idx_superuser_username ON superusers(username);
CREATE INDEX idx_superuser_status ON superusers(status);
