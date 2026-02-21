-- Create a table for saving the teachers data, should include roles array including set of strings

CREATE TYPE teacher_status AS ENUM('Active', 'Inactive', 'Retired');
CREATE TYPE teacher_gender AS ENUM('Male', 'Female', 'Other');

CREATE TABLE teachers (
    teacher_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender teacher_gender,
    qualification VARCHAR(255),
    specialization VARCHAR(100),
    status teacher_status DEFAULT 'Active',
    roles JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
);

CREATE INDEX idx_employee_id ON teachers(employee_id);
CREATE INDEX idx_status ON teachers(status);



