CREATE TABLE teacher_salary_rates (
    rate_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL REFERENCES edu_centers(center_id) ON DELETE CASCADE,
    teacher_id INT NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
    class_id INT NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
    monthly_salary_amount DECIMAL(12,2) NOT NULL CHECK (monthly_salary_amount >= 0),
    effective_from DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (class_id)
);

CREATE TABLE teacher_salary_payments (
    salary_payment_id SERIAL PRIMARY KEY,
    center_id INT NOT NULL REFERENCES edu_centers(center_id) ON DELETE CASCADE,
    teacher_id INT NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
    salary_year INT NOT NULL CHECK (salary_year >= 2000),
    salary_month INT NOT NULL CHECK (salary_month BETWEEN 1 AND 12),
    amount_paid DECIMAL(12,2) NOT NULL CHECK (amount_paid >= 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teacher_salary_rates_center_teacher
ON teacher_salary_rates(center_id, teacher_id);

CREATE INDEX idx_teacher_salary_payments_center_period
ON teacher_salary_payments(center_id, salary_year, salary_month, teacher_id);
