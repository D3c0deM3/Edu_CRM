-- Create table for saving the grades of the students

CREATE TYPE grade_status AS ENUM('Present', 'Absent', 'Late', 'Half Day');

CREATE TABLE grades (
    grade_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    teacher_id INT NOT NULL,
    subject VARCHAR(100),
    class_id INT,
    marks_obtained DECIMAL(6,2),
    total_marks INT DEFAULT 100,
    percentage DECIMAL(5,2),
    grade_letter VARCHAR(5),
    academic_year INT,
    term VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
);

CREATE INDEX idx_sstudent_id ON grades(student_id);
CREATE INDEX idx_academic_year ON grades(academic_year);

