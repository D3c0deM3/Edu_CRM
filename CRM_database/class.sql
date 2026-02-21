-- Create table for saving class data, payment information, and class details

CREATE TYPE class_status AS ENUM('Active', 'Dropped', 'Graduated');
CREATE TYPE payment_frequency AS ENUM('Monthly', 'Quarterly', 'Annual');

CREATE TABLE classes (
    class_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    class_code VARCHAR(50) NOT NULL UNIQUE,
    level INT,
    section VARCHAR(10),
    capacity INT,
    teacher_id INT,
    room_number VARCHAR(50),
    total_students INT DEFAULT 0,
    payment_amount DECIMAL(12,2),
    payment_frequency payment_frequency DEFAULT 'Monthly',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
);

CREATE INDEX idx_class_code ON classes(class_code);
CREATE INDEX idx_level ON classes(level);


