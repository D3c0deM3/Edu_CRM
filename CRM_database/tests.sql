-- ============================================================================
-- Tests and Examinations System
-- Supports multiple test types: multiple choice, form filling, essay, 
-- short answer, true/false, matching, reading passages, writing tests
-- ============================================================================

-- Test type enum
CREATE TYPE test_type AS ENUM(
    'multiple_choice', 
    'form_filling', 
    'essay', 
    'short_answer', 
    'true_false', 
    'matching',
    'reading_passage',
    'writing'
);

-- Test visibility/assignment type
CREATE TYPE test_assignment_type AS ENUM(
    'all_students',
    'specific_students',
    'specific_class',
    'specific_teacher'
);

-- Test submission status
CREATE TYPE test_submission_status AS ENUM(
    'not_started',
    'in_progress',
    'submitted',
    'graded',
    'reviewed'
);

-- ============================================================================
-- Tests Table - Main test definition
-- ============================================================================
CREATE TABLE tests (
    test_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL,
    subject_id INT,
    test_name VARCHAR(255) NOT NULL,
    test_type test_type NOT NULL,
    description TEXT,
    instructions TEXT,
    total_marks INT NOT NULL DEFAULT 0,
    passing_marks INT NOT NULL DEFAULT 0,
    duration_minutes INT DEFAULT 60,
    assignment_type test_assignment_type DEFAULT 'all_students',
    is_timed BOOLEAN DEFAULT TRUE,
    shuffle_questions BOOLEAN DEFAULT FALSE,
    show_results_immediately BOOLEAN DEFAULT TRUE,
    allow_retake BOOLEAN DEFAULT FALSE,
    max_retakes INT DEFAULT 1,
    test_data JSONB NOT NULL DEFAULT '{}',
    created_by INT NOT NULL,
    created_by_type VARCHAR(20) DEFAULT 'superuser',
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE SET NULL
);

CREATE INDEX idx_tests_center ON tests(center_id);
CREATE INDEX idx_tests_subject ON tests(subject_id);
CREATE INDEX idx_tests_type ON tests(test_type);
CREATE INDEX idx_tests_active ON tests(is_active);
CREATE INDEX idx_tests_dates ON tests(start_date, end_date);

-- ============================================================================
-- Test Assignments - Assign tests to specific students/teachers
-- ============================================================================
CREATE TABLE test_assignments (
    assignment_id SERIAL PRIMARY KEY,
    test_id INT NOT NULL,
    assigned_to_type VARCHAR(20) NOT NULL,
    assigned_to_id INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    is_mandatory BOOLEAN DEFAULT TRUE,
    notes TEXT,
    
    FOREIGN KEY (test_id) REFERENCES tests(test_id) ON DELETE CASCADE,
    UNIQUE(test_id, assigned_to_type, assigned_to_id)
);

CREATE INDEX idx_test_assignments_test ON test_assignments(test_id);
CREATE INDEX idx_test_assignments_assigned ON test_assignments(assigned_to_type, assigned_to_id);

-- ============================================================================
-- Reading Passages - For reading comprehension tests
-- ============================================================================
CREATE TABLE reading_passages (
    passage_id SERIAL PRIMARY KEY,
    test_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    word_count INT,
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    passage_order INT DEFAULT 1,
    audio_url VARCHAR(500),
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (test_id) REFERENCES tests(test_id) ON DELETE CASCADE
);

CREATE INDEX idx_passages_test ON reading_passages(test_id);

-- ============================================================================
-- Test Questions - Individual questions for tests
-- ============================================================================
CREATE TABLE test_questions (
    question_id SERIAL PRIMARY KEY,
    test_id INT NOT NULL,
    passage_id INT,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    marks INT NOT NULL DEFAULT 1,
    negative_marks DECIMAL(5,2) DEFAULT 0,
    question_order INT DEFAULT 1,
    options JSONB,
    correct_answer JSONB,
    explanation TEXT,
    image_url VARCHAR(500),
    is_required BOOLEAN DEFAULT TRUE,
    word_limit INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (test_id) REFERENCES tests(test_id) ON DELETE CASCADE,
    FOREIGN KEY (passage_id) REFERENCES reading_passages(passage_id) ON DELETE SET NULL
);

CREATE INDEX idx_questions_test ON test_questions(test_id);
CREATE INDEX idx_questions_passage ON test_questions(passage_id);

-- ============================================================================
-- Test Submissions - Student test submissions
-- ============================================================================
CREATE TABLE test_submissions (
    submission_id SERIAL PRIMARY KEY,
    test_id INT NOT NULL,
    student_id INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    time_taken_seconds INT,
    submission_data JSONB NOT NULL DEFAULT '{}',
    total_score DECIMAL(10,2),
    obtained_marks DECIMAL(10,2),
    percentage DECIMAL(5,2),
    status test_submission_status DEFAULT 'not_started',
    is_passed BOOLEAN,
    feedback TEXT,
    graded_by INT,
    graded_by_type VARCHAR(20),
    graded_at TIMESTAMP,
    attempt_number INT DEFAULT 1,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (test_id) REFERENCES tests(test_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE INDEX idx_submissions_test ON test_submissions(test_id);
CREATE INDEX idx_submissions_student ON test_submissions(student_id);
CREATE INDEX idx_submissions_status ON test_submissions(status);
CREATE INDEX idx_submissions_graded ON test_submissions(graded_by, graded_by_type);

-- ============================================================================
-- Test Answer Details - Individual question answers
-- ============================================================================
CREATE TABLE test_answers (
    answer_id SERIAL PRIMARY KEY,
    submission_id INT NOT NULL,
    question_id INT NOT NULL,
    student_answer JSONB,
    is_correct BOOLEAN,
    marks_obtained DECIMAL(5,2) DEFAULT 0,
    feedback TEXT,
    graded BOOLEAN DEFAULT FALSE,
    graded_at TIMESTAMP,
    
    FOREIGN KEY (submission_id) REFERENCES test_submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES test_questions(question_id) ON DELETE CASCADE
);

CREATE INDEX idx_answers_submission ON test_answers(submission_id);
CREATE INDEX idx_answers_question ON test_answers(question_id);

-- ============================================================================
-- Test Results Summary - Aggregated results view
-- ============================================================================
CREATE TABLE test_results_summary (
    result_id SERIAL PRIMARY KEY,
    test_id INT NOT NULL,
    student_id INT NOT NULL,
    best_score DECIMAL(10,2),
    average_score DECIMAL(10,2),
    total_attempts INT DEFAULT 0,
    last_attempt_at TIMESTAMP,
    first_passed_at TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE,
    certificate_issued BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (test_id) REFERENCES tests(test_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    UNIQUE(test_id, student_id)
);

CREATE INDEX idx_results_test ON test_results_summary(test_id);
CREATE INDEX idx_results_student ON test_results_summary(student_id);

-- ============================================================================
-- JSON Structure Examples
-- ============================================================================
-- Multiple Choice options: ["Paris", "London", "Berlin", "Madrid"]
-- MCQ correct_answer: {"index": 0} or {"indexes": [0, 2]} for multiple correct
-- Fill blank: {"answers": ["Paris", "paris", "PARIS"]}
-- True/False: {"value": true}
-- Matching: {"pairs": [{"left": 0, "right": 2}, {"left": 1, "right": 0}]}
-- Essay: null (manual grading)
