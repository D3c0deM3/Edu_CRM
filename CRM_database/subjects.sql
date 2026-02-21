
CREATE TABLE subjects (
    subject_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    subject_code VARCHAR(50),
    teacher_id INT,
    total_marks INT DEFAULT 100,
    passing_marks INT DEFAULT 40,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

