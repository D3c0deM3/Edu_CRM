
CREATE TABLE attendance (
    attendance_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    teacher_id INT NOT NULL,
    class_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Late', 'Half Day') DEFAULT 'Present',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
    INDEX idx_attendance_date (attendance_date)
);