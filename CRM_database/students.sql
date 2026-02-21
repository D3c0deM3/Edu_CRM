-- Create a table for saving the students data where it should have id and teacher_id

CREATE TYPE student_status AS ENUM('Active', 'Inactive', 'Graduated', 'Removed');
CREATE TYPE student_gender AS ENUM('Male', 'Female', 'Other');

CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    enrollment_number VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    parent_name VARCHAR(200),
    parent_phone VARCHAR(20),
    gender student_gender,
    status student_status DEFAULT 'Active',
    teacher_id INT,
    class_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enrollment_number ON students(enrollment_number);
CREATE INDEX idx_stastus ON students(status);
CREATE INDEX idx_teacher_id ON students(teacher_id);

