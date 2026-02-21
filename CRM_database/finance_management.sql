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



