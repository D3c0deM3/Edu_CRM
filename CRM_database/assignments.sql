-- PostgreSQL: Create assignments table to store assignment details
-- Stores class assignments with tracking for submission, grading, and status

-- Create ENUM type for assignment status
CREATE TYPE assignment_status AS ENUM ('Pending', 'Submitted', 'Graded');

CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    assignment_title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    submission_date DATE,
    grade DECIMAL(5,2),
    status assignment_status DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_class_id ON assignments(class_id);
CREATE INDEX idx_statuss ON assignments(status);
