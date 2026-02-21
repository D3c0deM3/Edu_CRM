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



-- Create tables for saving the database information only

CREATE TABLE edu_centers (
    center_id SERIAL PRIMARY KEY,
    center_name VARCHAR(255) NOT NULL,
    center_code VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    principal_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_center_code ON edu_centers(center_code);

-- Create tables for managing the debts given and taken and its management

CREATE TYPE debt_payment_method AS ENUM('Cash', 'Credit Card', 'Bank Transfer', 'Check');

CREATE TABLE debts (
    debt_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    center_id INT NOT NULL,
    debt_amount DECIMAL(12,2) NOT NULL,
    debt_date DATE NOT NULL,
    due_date DATE,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
);

CREATE INDEX idx_debt_date ON debts(debt_date);




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


-- Create table for the payment records of the students

CREATE TYPE payment_method AS ENUM('Cash', 'Credit Card', 'Bank Transfer', 'Check', 'Digital Wallet');
CREATE TYPE payment_status AS ENUM('Pending', 'Completed', 'Failed', 'Refunded');
CREATE TYPE fee_frequency AS ENUM('One Time', 'Monthly', 'Quarterly', 'Annual');
CREATE TYPE registration_status AS ENUM('Pending', 'Partial', 'Paid', 'Overdue');

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    center_id INT NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method payment_method DEFAULT 'Cash',
    transaction_reference VARCHAR(100),
    receipt_number VARCHAR(50) UNIQUE,
    payment_status VARCHAR(50) DEFAULT 'Completed',
    payment_type VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
);

CREATE INDEX idx_payment_date ON payments(payment_date);
CREATE INDEX idx_payment_status ON payments(payment_status);
CREATE INDEX idx_student_id ON payments(student_id);


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