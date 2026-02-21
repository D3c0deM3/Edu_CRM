-- Create table for assignment submissions with all required fields

CREATE TABLE assignment_submissions (
    submission_id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    submission_date TIMESTAMP NOT NULL,
    file_path VARCHAR(500),
    grade DECIMAL(6,2),
    feedback TEXT,
    status VARCHAR(50) DEFAULT 'Submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);
CREATE INDEX idx_assignment_submission_id ON assignment_submissions(assignment_id);
CREATE INDEX idx_student_submission_id ON assignment_submissions(student_id);

