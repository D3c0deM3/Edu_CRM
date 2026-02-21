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
