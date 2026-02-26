# CRM Database Documentation

## Overview

This is the PostgreSQL relational database for an **Education-Focused CRM System**. It manages the full lifecycle of educational operations including students, teachers, classes, subjects, attendance, grades, payments, debts, assignments, and tests/examinations.

---

## Database Connection Details

| Property         | Value                  |
|------------------|------------------------|
| **Database Name**| `crm_db`               |
| **DBMS**         | PostgreSQL 16          |
| **Host**         | `localhost`            |
| **Port**         | `5432`                 |
| **Username**     | `crm_user`             |
| **Password**     | `crm_password`         |

### Docker Setup

The database runs in a Docker container defined in `CRM_backend/docker-compose.yml`.

```bash
# Start PostgreSQL + pgAdmin
cd CRM_backend
docker-compose up -d
```

| Service    | URL                        | Credentials                            |
|------------|----------------------------|----------------------------------------|
| PostgreSQL | `localhost:5432`           | `crm_user` / `crm_password`            |
| pgAdmin 4  | http://localhost:5050      | `admin@crm.com` / `admin_password`     |

### Environment Variable Overrides (Backend)

The backend (`CRM_backend/config/dbcon.ts`) accepts these env vars to override defaults:

| Variable      | Default         |
|---------------|-----------------|
| `DB_HOST`     | `localhost`     |
| `DB_PORT`     | `5432`          |
| `DB_USER`     | `postgres`      |
| `DB_PASSWORD` | `12345678`      |
| `DB_NAME`     | `crm_db`        |

---

## Database Schema Summary

The database contains **19 tables** across these domains:

| Domain              | Tables                                                                 |
|---------------------|------------------------------------------------------------------------|
| Organization        | `edu_centers`                                                          |
| Users               | `students`, `teachers`, `superusers`                                   |
| Academics           | `classes`, `subjects`                                                  |
| Tracking            | `attendance`, `grades`                                                 |
| Finance             | `payments`, `debts`                                                    |
| Assignments         | `assignments`, `assignment_submissions`                                |
| Tests & Exams       | `tests`, `test_assignments`, `reading_passages`, `test_questions`, `test_submissions`, `test_answers`, `test_results_summary` |

---

## Tables

### 1. `edu_centers`
Stores information about educational centers/institutions. This is the top-level entity; most other tables reference it.

| Column           | Type           | Constraints              | Description                            |
|------------------|----------------|--------------------------|----------------------------------------|
| `center_id`      | SERIAL         | PRIMARY KEY              | Auto-incremented unique ID             |
| `center_name`    | VARCHAR(255)   | NOT NULL                 | Full name of the center                |
| `center_code`    | VARCHAR(50)    | NOT NULL, UNIQUE         | Short identifier code for the center   |
| `email`          | VARCHAR(100)   |                          | Contact email                          |
| `phone`          | VARCHAR(20)    |                          | Contact phone number                   |
| `address`        | TEXT           |                          | Physical address                       |
| `city`           | VARCHAR(100)   |                          | City                                   |
| `principal_name` | VARCHAR(100)   |                          | Name of the principal/head             |
| `created_at`     | TIMESTAMP      | DEFAULT NOW()            | Record creation time                   |
| `updated_at`     | TIMESTAMP      | DEFAULT NOW()            | Last update time                       |

**Indexes:** `idx_center_code` on `center_code`

---

### 2. `students`
Stores student profiles including personal info, enrollment details, login credentials, and references to their teacher and class.

**ENUM types used:**
- `student_status`: `Active`, `Inactive`, `Graduated`, `Removed`
- `student_gender`: `Male`, `Female`, `Other`

| Column              | Type           | Constraints              | Description                              |
|---------------------|----------------|--------------------------|------------------------------------------|
| `student_id`        | SERIAL         | PRIMARY KEY              | Auto-incremented unique ID               |
| `center_id`         | INT            | NOT NULL                 | Associated center                        |
| `enrollment_number` | VARCHAR(50)    | NOT NULL, UNIQUE         | Unique enrollment identifier             |
| `first_name`        | VARCHAR(100)   | NOT NULL                 | First name                               |
| `last_name`         | VARCHAR(100)   | NOT NULL                 | Last name                                |
| `username`          | VARCHAR(100)   | UNIQUE                   | Login username                           |
| `password_hash`     | VARCHAR(255)   |                          | Hashed password for authentication       |
| `email`             | VARCHAR(100)   |                          | Email address                            |
| `phone`             | VARCHAR(20)    |                          | Phone number                             |
| `date_of_birth`     | DATE           |                          | Date of birth                            |
| `parent_name`       | VARCHAR(200)   |                          | Parent or guardian name                  |
| `parent_phone`      | VARCHAR(20)    |                          | Parent or guardian phone                 |
| `gender`            | student_gender |                          | Gender                                   |
| `status`            | student_status | DEFAULT `'Active'`       | Enrollment status                        |
| `teacher_id`        | INT            |                          | Assigned teacher (ref. `teachers`)       |
| `class_id`          | INT            |                          | Enrolled class (ref. `classes`)          |
| `created_at`        | TIMESTAMP      | DEFAULT NOW()            | Record creation time                     |
| `updated_at`        | TIMESTAMP      | DEFAULT NOW()            | Last update time                         |

**Indexes:** `idx_enrollment_number`, `idx_stastus` (status), `idx_teacher_id`

---

### 3. `teachers`
Stores teacher profiles with login credentials, professional info, and JSONB roles array.

**ENUM types used:**
- `teacher_status`: `Active`, `Inactive`, `Retired`
- `teacher_gender`: `Male`, `Female`, `Other`

| Column           | Type            | Constraints                              | Description                           |
|------------------|-----------------|------------------------------------------|---------------------------------------|
| `teacher_id`     | SERIAL          | PRIMARY KEY                              | Auto-incremented unique ID            |
| `center_id`      | INT             | NOT NULL, FK → `edu_centers.center_id`   | Associated center                     |
| `employee_id`    | VARCHAR(50)     | NOT NULL, UNIQUE                         | Unique employee identifier            |
| `first_name`     | VARCHAR(100)    | NOT NULL                                 | First name                            |
| `last_name`      | VARCHAR(100)    | NOT NULL                                 | Last name                             |
| `email`          | VARCHAR(100)    | UNIQUE                                   | Email address                         |
| `phone`          | VARCHAR(20)     |                                          | Phone number                          |
| `date_of_birth`  | DATE            |                                          | Date of birth                         |
| `gender`         | teacher_gender  |                                          | Gender                                |
| `qualification`  | VARCHAR(255)    |                                          | Educational qualification             |
| `specialization` | VARCHAR(100)    |                                          | Subject or area of specialization     |
| `status`         | teacher_status  | DEFAULT `'Active'`                       | Employment status                     |
| `roles`          | JSONB           |                                          | Array of roles (e.g. `["Math","Admin"]`) |
| `username`       | VARCHAR(100)    | UNIQUE                                   | Login username                        |
| `password_hash`  | VARCHAR(255)    |                                          | Hashed password                       |
| `created_at`     | TIMESTAMP       | DEFAULT NOW()                            | Record creation time                  |
| `updated_at`     | TIMESTAMP       | DEFAULT NOW()                            | Last update time                      |

**Indexes:** `idx_employee_id`, `idx_status`

---

### 4. `superusers`
Stores admin/superuser accounts with security features like login attempt tracking and account locking.

**ENUM types used:**
- `superuser_status`: `Active`, `Inactive`, `Suspended`

| Column           | Type              | Constraints                              | Description                            |
|------------------|-------------------|------------------------------------------|----------------------------------------|
| `superuser_id`   | SERIAL            | PRIMARY KEY                              | Auto-incremented unique ID             |
| `center_id`      | INT               | NOT NULL, FK → `edu_centers.center_id`   | Associated center                      |
| `username`       | VARCHAR(100)      | NOT NULL, UNIQUE                         | Login username                         |
| `email`          | VARCHAR(100)      | UNIQUE                                   | Email address                          |
| `password_hash`  | VARCHAR(255)      | NOT NULL                                 | Hashed password                        |
| `first_name`     | VARCHAR(100)      |                                          | First name                             |
| `last_name`      | VARCHAR(100)      |                                          | Last name                              |
| `role`           | VARCHAR(100)      | DEFAULT `'Admin'`                        | Role label                             |
| `permissions`    | JSONB             |                                          | Fine-grained permissions object        |
| `status`         | superuser_status  | DEFAULT `'Active'`                       | Account status                         |
| `last_login`     | TIMESTAMP         |                                          | Last successful login time             |
| `login_attempts` | INT               | DEFAULT `0`                              | Failed login attempt counter           |
| `is_locked`      | BOOLEAN           | DEFAULT `FALSE`                          | Whether account is currently locked    |
| `locked_until`   | TIMESTAMP         |                                          | Lockout expiry time                    |
| `created_at`     | TIMESTAMP         | DEFAULT NOW()                            | Record creation time                   |
| `updated_at`     | TIMESTAMP         | DEFAULT NOW()                            | Last update time                       |

**Indexes:** `idx_superuser_username`, `idx_superuser_status`

---

### 5. `classes`
Stores class definitions including capacity, payment configuration, and assigned teacher.

**ENUM types used:**
- `class_status`: `Active`, `Dropped`, `Graduated`
- `payment_frequency`: `Monthly`, `Quarterly`, `Annual`

| Column             | Type               | Constraints                              | Description                           |
|--------------------|--------------------|------------------------------------------|---------------------------------------|
| `class_id`         | SERIAL             | PRIMARY KEY                              | Auto-incremented unique ID            |
| `center_id`        | INT                | NOT NULL, FK → `edu_centers.center_id`   | Associated center                     |
| `class_name`       | VARCHAR(100)       | NOT NULL                                 | Name of the class                     |
| `class_code`       | VARCHAR(50)        | NOT NULL, UNIQUE                         | Unique class code                     |
| `level`            | INT                |                                          | Grade/year level                      |
| `section`          | TEXT               |                                          | Section or group identifier           |
| `capacity`         | INT                |                                          | Maximum number of students            |
| `teacher_id`       | INT                | FK → `teachers.teacher_id`               | Class homeroom teacher                |
| `room_number`      | VARCHAR(50)        |                                          | Assigned room                         |
| `total_students`   | INT                | DEFAULT `0`                              | Current student count                 |
| `payment_amount`   | DECIMAL(12,2)      |                                          | Fee amount for this class             |
| `payment_frequency`| payment_frequency  | DEFAULT `'Monthly'`                      | How often the fee is charged          |
| `created_at`       | TIMESTAMP          | DEFAULT NOW()                            | Record creation time                  |
| `updated_at`       | TIMESTAMP          | DEFAULT NOW()                            | Last update time                      |

**Indexes:** `idx_class_code`, `idx_level`

---

### 6. `subjects`
Stores subjects taught within a class, with a reference to the responsible teacher and marking scheme.

| Column          | Type         | Constraints                          | Description                          |
|-----------------|--------------|--------------------------------------|--------------------------------------|
| `subject_id`    | SERIAL       | PRIMARY KEY                          | Auto-incremented unique ID           |
| `class_id`      | INT          | NOT NULL (ref. `classes.class_id`)   | Class this subject belongs to        |
| `subject_name`  | VARCHAR(100) | NOT NULL                             | Name of the subject                  |
| `subject_code`  | VARCHAR(50)  |                                      | Short code for the subject           |
| `teacher_id`    | INT          | (ref. `teachers.teacher_id`)         | Teacher responsible for the subject  |
| `total_marks`   | INT          | DEFAULT `100`                        | Maximum possible marks               |
| `passing_marks` | INT          | DEFAULT `40`                         | Minimum marks to pass                |
| `created_at`    | TIMESTAMP    | DEFAULT NOW()                        | Record creation time                 |

---

### 7. `attendance`
Tracks daily attendance for each student per class and teacher.

**Status values (ENUM inline):** `Present`, `Absent`, `Late`, `Half Day`

| Column            | Type      | Constraints                              | Description                          |
|-------------------|-----------|------------------------------------------|--------------------------------------|
| `attendance_id`   | SERIAL    | PRIMARY KEY                              | Auto-incremented unique ID           |
| `student_id`      | INT       | NOT NULL, FK → `students.student_id`     | Student                              |
| `teacher_id`      | INT       | NOT NULL, FK → `teachers.teacher_id`     | Teacher recording attendance         |
| `class_id`        | INT       | NOT NULL                                 | Associated class                     |
| `attendance_date` | DATE      | NOT NULL                                 | Date of attendance                   |
| `status`          | ENUM      | DEFAULT `'Present'`                      | Attendance status                    |
| `remarks`         | TEXT      |                                          | Optional notes                       |
| `created_at`      | TIMESTAMP | DEFAULT NOW()                            | Record creation time                 |

**Indexes:** `idx_attendance_date`

---

### 8. `grades`
Stores student grades per subject per academic term.

| Column           | Type          | Constraints                              | Description                          |
|------------------|---------------|------------------------------------------|--------------------------------------|
| `grade_id`       | SERIAL        | PRIMARY KEY                              | Auto-incremented unique ID           |
| `student_id`     | INT           | NOT NULL, FK → `students.student_id`     | Student                              |
| `teacher_id`     | INT           | NOT NULL, FK → `teachers.teacher_id`     | Teacher who assigned the grade       |
| `subject`        | VARCHAR(100)  |                                          | Subject name (denormalized)          |
| `class_id`       | INT           |                                          | Associated class                     |
| `marks_obtained` | DECIMAL(6,2)  |                                          | Marks earned                         |
| `total_marks`    | INT           | DEFAULT `100`                            | Total possible marks                 |
| `percentage`     | DECIMAL(5,2)  |                                          | Calculated percentage                |
| `grade_letter`   | VARCHAR(5)    |                                          | Letter grade (e.g. A, B+)            |
| `academic_year`  | INT           |                                          | Year (e.g. 2025)                     |
| `term`           | VARCHAR(50)   |                                          | Term/semester label                  |
| `created_at`     | TIMESTAMP     | DEFAULT NOW()                            | Record creation time                 |
| `updated_at`     | TIMESTAMP     | DEFAULT NOW()                            | Last update time                     |

**Indexes:** `idx_sstudent_id` (student_id), `idx_academic_year`

---

### 9. `payments`
Records all fee/tuition payments made by students.

**ENUM types used:**
- `payment_method`: `Cash`, `Credit Card`, `Bank Transfer`, `Check`, `Digital Wallet`
- `payment_status`: `Pending`, `Completed`, `Failed`, `Refunded`
- `fee_frequency`: `One Time`, `Monthly`, `Quarterly`, `Annual`
- `registration_status`: `Pending`, `Partial`, `Paid`, `Overdue`

| Column                  | Type            | Constraints                              | Description                          |
|-------------------------|-----------------|------------------------------------------|--------------------------------------|
| `payment_id`            | SERIAL          | PRIMARY KEY                              | Auto-incremented unique ID           |
| `student_id`            | INT             | NOT NULL, FK → `students.student_id`     | Student making the payment           |
| `center_id`             | INT             | NOT NULL, FK → `edu_centers.center_id`   | Associated center                    |
| `payment_date`          | DATE            | NOT NULL                                 | Date of payment                      |
| `amount`                | DECIMAL(12,2)   | NOT NULL                                 | Amount paid                          |
| `currency`              | VARCHAR(10)     | DEFAULT `'USD'`                          | Currency code                        |
| `payment_method`        | payment_method  | DEFAULT `'Cash'`                         | Method of payment                    |
| `transaction_reference` | VARCHAR(100)    |                                          | External transaction ID              |
| `receipt_number`        | VARCHAR(50)     | UNIQUE                                   | Unique receipt number                |
| `payment_status`        | VARCHAR(50)     | DEFAULT `'Completed'`                    | Payment status                       |
| `payment_type`          | VARCHAR(100)    |                                          | Type of fee (tuition, registration…) |
| `notes`                 | TEXT            |                                          | Optional notes                       |
| `created_at`            | TIMESTAMP       | DEFAULT NOW()                            | Record creation time                 |
| `updated_at`            | TIMESTAMP       | DEFAULT NOW()                            | Last update time                     |

**Indexes:** `idx_payment_date`, `idx_payment_status`, `idx_student_id`

---

### 10. `debts`
Tracks outstanding balances owed by students to the center.

**ENUM types used:**
- `debt_payment_method`: `Cash`, `Credit Card`, `Bank Transfer`, `Check`

| Column         | Type          | Constraints                              | Description                          |
|----------------|---------------|------------------------------------------|--------------------------------------|
| `debt_id`      | SERIAL        | PRIMARY KEY                              | Auto-incremented unique ID           |
| `student_id`   | INT           | NOT NULL, FK → `students.student_id`     | Student who owes the debt            |
| `center_id`    | INT           | NOT NULL, FK → `edu_centers.center_id`   | Associated center                    |
| `debt_amount`  | DECIMAL(12,2) | NOT NULL                                 | Total amount owed                    |
| `debt_date`    | DATE          | NOT NULL                                 | Date debt was recorded               |
| `due_date`     | DATE          |                                          | Payment due date                     |
| `amount_paid`  | DECIMAL(12,2) | DEFAULT `0`                              | Amount already paid toward debt      |
| `balance`      | DECIMAL(12,2) |                                          | Remaining balance                    |
| `remarks`      | TEXT          |                                          | Optional notes                       |
| `created_at`   | TIMESTAMP     | DEFAULT NOW()                            | Record creation time                 |
| `updated_at`   | TIMESTAMP     | DEFAULT NOW()                            | Last update time                     |

**Indexes:** `idx_debt_date`

---

### 11. `assignments`
Stores class-level assignments with due dates and grading info.

**ENUM types used:**
- `assignment_status`: `Pending`, `Submitted`, `Graded`

| Column             | Type              | Constraints                                  | Description                        |
|--------------------|-------------------|----------------------------------------------|------------------------------------|
| `assignment_id`    | SERIAL            | PRIMARY KEY                                  | Auto-incremented unique ID         |
| `class_id`         | INT               | NOT NULL, FK → `classes.class_id` ON DELETE CASCADE | Associated class              |
| `assignment_title` | VARCHAR(255)      | NOT NULL                                     | Title of the assignment            |
| `description`      | TEXT              |                                              | Detailed description               |
| `due_date`         | DATE              |                                              | Deadline for submission            |
| `submission_date`  | DATE              |                                              | Actual submission date             |
| `grade`            | DECIMAL(5,2)      |                                              | Overall grade awarded              |
| `status`           | assignment_status | DEFAULT `'Pending'`                          | Current status                     |
| `created_at`       | TIMESTAMP         | DEFAULT NOW()                                | Record creation time               |
| `updated_at`       | TIMESTAMP         | DEFAULT NOW()                                | Last update time                   |

**Indexes:** `idx_class_id`, `idx_statuss` (status)

---

### 12. `assignment_submissions`
Records individual student submissions for assignments.

| Column            | Type          | Constraints                                        | Description                       |
|-------------------|---------------|----------------------------------------------------|-----------------------------------|
| `submission_id`   | SERIAL        | PRIMARY KEY                                        | Auto-incremented unique ID        |
| `assignment_id`   | INT           | NOT NULL, FK → `assignments.assignment_id`         | Associated assignment             |
| `student_id`      | INT           | NOT NULL, FK → `students.student_id`               | Student who submitted             |
| `submission_date` | TIMESTAMP     | NOT NULL                                           | Date and time of submission       |
| `file_path`       | VARCHAR(500)  |                                                    | Path to uploaded submission file  |
| `grade`           | DECIMAL(6,2)  |                                                    | Grade for this submission         |
| `feedback`        | TEXT          |                                                    | Teacher feedback                  |
| `status`          | VARCHAR(50)   | DEFAULT `'Submitted'`                              | Submission status                 |
| `created_at`      | TIMESTAMP     | DEFAULT NOW()                                      | Record creation time              |
| `updated_at`      | TIMESTAMP     | DEFAULT NOW()                                      | Last update time                  |

**Unique constraint:** `(assignment_id, student_id)` — one submission per student per assignment

**Indexes:** `idx_assignment_submission_id` (assignment_id), `idx_student_submission_id` (student_id)

---

### 13. `tests`
Main table for test/exam definitions. Supports multiple test formats.

**ENUM types used:**
- `test_type`: `multiple_choice`, `form_filling`, `essay`, `short_answer`, `true_false`, `matching`, `reading_passage`, `writing`
- `test_assignment_type`: `all_students`, `specific_students`, `specific_class`, `specific_teacher`

| Column                    | Type                  | Constraints                                          | Description                              |
|---------------------------|-----------------------|------------------------------------------------------|------------------------------------------|
| `test_id`                 | SERIAL                | PRIMARY KEY                                          | Auto-incremented unique ID               |
| `center_id`               | INT                   | NOT NULL, FK → `edu_centers.center_id` ON DELETE CASCADE | Associated center                  |
| `subject_id`              | INT                   | FK → `subjects.subject_id` ON DELETE SET NULL        | Related subject (optional)               |
| `test_name`               | VARCHAR(255)          | NOT NULL                                             | Title of the test                        |
| `test_type`               | test_type             | NOT NULL                                             | Format of the test                       |
| `description`             | TEXT                  |                                                      | Test description                         |
| `instructions`            | TEXT                  |                                                      | Instructions for students                |
| `total_marks`             | INT                   | NOT NULL, DEFAULT `0`                                | Maximum score                            |
| `passing_marks`           | INT                   | NOT NULL, DEFAULT `0`                                | Minimum score to pass                    |
| `duration_minutes`        | INT                   | DEFAULT `60`                                         | Time limit in minutes                    |
| `assignment_type`         | test_assignment_type  | DEFAULT `'all_students'`                             | Who the test is assigned to              |
| `is_timed`                | BOOLEAN               | DEFAULT `TRUE`                                       | Whether a time limit applies             |
| `shuffle_questions`       | BOOLEAN               | DEFAULT `FALSE`                                      | Randomize question order                 |
| `show_results_immediately`| BOOLEAN               | DEFAULT `TRUE`                                       | Show results after submission            |
| `allow_retake`            | BOOLEAN               | DEFAULT `FALSE`                                      | Allow multiple attempts                  |
| `max_retakes`             | INT                   | DEFAULT `1`                                          | Max number of retakes allowed            |
| `test_data`               | JSONB                 | NOT NULL, DEFAULT `'{}'`                             | Flexible structured test content         |
| `created_by`              | INT                   | NOT NULL                                             | ID of creator (teacher or superuser)     |
| `created_by_type`         | VARCHAR(20)           | DEFAULT `'superuser'`                                | Type of creator                          |
| `is_active`               | BOOLEAN               | DEFAULT `TRUE`                                       | Whether test is published/active         |
| `start_date`              | TIMESTAMP             |                                                      | Test availability start                  |
| `end_date`                | TIMESTAMP             |                                                      | Test availability end                    |
| `created_at`              | TIMESTAMP             | DEFAULT NOW()                                        | Record creation time                     |
| `updated_at`              | TIMESTAMP             | DEFAULT NOW()                                        | Last update time                         |

**Indexes:** `idx_tests_center`, `idx_tests_subject`, `idx_tests_type`, `idx_tests_active`, `idx_tests_dates`

---

### 14. `test_assignments`
Assigns tests to specific students, teachers, or classes.

| Column             | Type        | Constraints                                      | Description                           |
|--------------------|-------------|--------------------------------------------------|---------------------------------------|
| `assignment_id`    | SERIAL      | PRIMARY KEY                                      | Auto-incremented unique ID            |
| `test_id`          | INT         | NOT NULL, FK → `tests.test_id` ON DELETE CASCADE | Associated test                       |
| `assigned_to_type` | VARCHAR(20) | NOT NULL                                         | `'student'`, `'teacher'`, or `'class'`|
| `assigned_to_id`   | INT         | NOT NULL                                         | ID of the target entity               |
| `assigned_by`      | INT         | NOT NULL                                         | ID of the user who assigned the test  |
| `assigned_at`      | TIMESTAMP   | DEFAULT NOW()                                    | Assignment time                       |
| `due_date`         | TIMESTAMP   |                                                  | Deadline for the assignment           |
| `is_mandatory`     | BOOLEAN     | DEFAULT `TRUE`                                   | Whether completion is required        |
| `notes`            | TEXT        |                                                  | Optional notes                        |

**Unique constraint:** `(test_id, assigned_to_type, assigned_to_id)`

**Indexes:** `idx_test_assignments_test`, `idx_test_assignments_assigned`

---

### 15. `reading_passages`
Stores reading passages for reading comprehension tests.

| Column            | Type         | Constraints                                      | Description                          |
|-------------------|--------------|--------------------------------------------------|--------------------------------------|
| `passage_id`      | SERIAL       | PRIMARY KEY                                      | Auto-incremented unique ID           |
| `test_id`         | INT          | NOT NULL, FK → `tests.test_id` ON DELETE CASCADE | Associated test                      |
| `title`           | VARCHAR(255) | NOT NULL                                         | Passage title                        |
| `content`         | TEXT         | NOT NULL                                         | Full passage text                    |
| `word_count`      | INT          |                                                  | Word count of the passage            |
| `difficulty_level`| VARCHAR(20)  | DEFAULT `'medium'`                               | Difficulty (easy / medium / hard)    |
| `passage_order`   | INT          | DEFAULT `1`                                      | Order within the test                |
| `audio_url`       | VARCHAR(500) |                                                  | URL to audio version (optional)      |
| `image_url`       | VARCHAR(500) |                                                  | URL to accompanying image (optional) |
| `created_at`      | TIMESTAMP    | DEFAULT NOW()                                    | Record creation time                 |

**Indexes:** `idx_passages_test`

---

### 16. `test_questions`
Stores individual questions for tests, with support for different question types.

| Column           | Type         | Constraints                                                    | Description                           |
|------------------|--------------|----------------------------------------------------------------|---------------------------------------|
| `question_id`    | SERIAL       | PRIMARY KEY                                                    | Auto-incremented unique ID            |
| `test_id`        | INT          | NOT NULL, FK → `tests.test_id` ON DELETE CASCADE               | Associated test                       |
| `passage_id`     | INT          | FK → `reading_passages.passage_id` ON DELETE SET NULL          | Linked passage (for reading tests)    |
| `question_text`  | TEXT         | NOT NULL                                                       | The question content                  |
| `question_type`  | VARCHAR(50)  | NOT NULL                                                       | Type of question                      |
| `marks`          | INT          | NOT NULL, DEFAULT `1`                                          | Points for this question              |
| `negative_marks` | DECIMAL(5,2) | DEFAULT `0`                                                    | Deduction for wrong answer            |
| `question_order` | INT          | DEFAULT `1`                                                    | Display order                         |
| `options`        | JSONB        |                                                                | Answer choices (for MCQ/matching)     |
| `correct_answer` | JSONB        |                                                                | Correct answer data                   |
| `explanation`    | TEXT         |                                                                | Explanation shown after submission    |
| `image_url`      | VARCHAR(500) |                                                                | Optional image for the question       |
| `is_required`    | BOOLEAN      | DEFAULT `TRUE`                                                 | Whether answer is required            |
| `word_limit`     | INT          |                                                                | Word limit for essay questions        |
| `created_at`     | TIMESTAMP    | DEFAULT NOW()                                                  | Record creation time                  |

**JSONB formats:**
- MCQ options: `["Paris", "London", "Berlin", "Madrid"]`
- MCQ correct_answer: `{"index": 0}` or `{"indexes": [0, 2]}` for multiple correct
- Fill blank: `{"answers": ["Paris", "paris", "PARIS"]}`
- True/False: `{"value": true}`
- Matching: `{"pairs": [{"left": 0, "right": 2}, {"left": 1, "right": 0}]}`
- Essay: `null` (manual grading)

**Indexes:** `idx_questions_test`, `idx_questions_passage`

---

### 17. `test_submissions`
Records student submission instances for tests.

**ENUM types used:**
- `test_submission_status`: `not_started`, `in_progress`, `submitted`, `graded`, `reviewed`

| Column                | Type              | Constraints                                          | Description                          |
|-----------------------|-------------------|------------------------------------------------------|--------------------------------------|
| `submission_id`       | SERIAL            | PRIMARY KEY                                          | Auto-incremented unique ID           |
| `test_id`             | INT               | NOT NULL, FK → `tests.test_id` ON DELETE CASCADE     | Associated test                      |
| `student_id`          | INT               | NOT NULL, FK → `students.student_id` ON DELETE CASCADE | Student who submitted               |
| `started_at`          | TIMESTAMP         | DEFAULT NOW()                                        | Time the test was started            |
| `submitted_at`        | TIMESTAMP         |                                                      | Time of submission                   |
| `time_taken_seconds`  | INT               |                                                      | Duration of the attempt in seconds   |
| `submission_data`     | JSONB             | NOT NULL, DEFAULT `'{}'`                             | Full raw submission data             |
| `total_score`         | DECIMAL(10,2)     |                                                      | Maximum possible score               |
| `obtained_marks`      | DECIMAL(10,2)     |                                                      | Marks obtained                       |
| `percentage`          | DECIMAL(5,2)      |                                                      | Score percentage                     |
| `status`              | test_submission_status | DEFAULT `'not_started'`                         | Current submission state             |
| `is_passed`           | BOOLEAN           |                                                      | Whether the student passed           |
| `feedback`            | TEXT              |                                                      | Overall feedback                     |
| `graded_by`           | INT               |                                                      | ID of grader                         |
| `graded_by_type`      | VARCHAR(20)       |                                                      | `'teacher'` or `'superuser'`         |
| `graded_at`           | TIMESTAMP         |                                                      | Time of grading                      |
| `attempt_number`      | INT               | DEFAULT `1`                                          | Which attempt this is                |
| `ip_address`          | VARCHAR(50)       |                                                      | Student's IP (for audit purposes)    |
| `created_at`          | TIMESTAMP         | DEFAULT NOW()                                        | Record creation time                 |
| `updated_at`          | TIMESTAMP         | DEFAULT NOW()                                        | Last update time                     |

**Indexes:** `idx_submissions_test`, `idx_submissions_student`, `idx_submissions_status`, `idx_submissions_graded`

---

### 18. `test_answers`
Stores individual per-question answers within a submission.

| Column           | Type          | Constraints                                                      | Description                          |
|------------------|---------------|------------------------------------------------------------------|--------------------------------------|
| `answer_id`      | SERIAL        | PRIMARY KEY                                                      | Auto-incremented unique ID           |
| `submission_id`  | INT           | NOT NULL, FK → `test_submissions.submission_id` ON DELETE CASCADE| Parent submission                    |
| `question_id`    | INT           | NOT NULL, FK → `test_questions.question_id` ON DELETE CASCADE    | Question being answered              |
| `student_answer` | JSONB         |                                                                  | Student's answer in structured form  |
| `is_correct`     | BOOLEAN       |                                                                  | Auto-graded correctness flag         |
| `marks_obtained` | DECIMAL(5,2)  | DEFAULT `0`                                                      | Marks awarded for this answer        |
| `feedback`       | TEXT          |                                                                  | Per-question feedback                |
| `graded`         | BOOLEAN       | DEFAULT `FALSE`                                                  | Whether this answer has been graded  |
| `graded_at`      | TIMESTAMP     |                                                                  | Time of grading                      |

**Indexes:** `idx_answers_submission`, `idx_answers_question`

---

### 19. `test_results_summary`
Aggregated results per student per test for quick lookups and reporting.

| Column               | Type          | Constraints                                          | Description                            |
|----------------------|---------------|------------------------------------------------------|----------------------------------------|
| `result_id`          | SERIAL        | PRIMARY KEY                                          | Auto-incremented unique ID             |
| `test_id`            | INT           | NOT NULL, FK → `tests.test_id` ON DELETE CASCADE     | Associated test                        |
| `student_id`         | INT           | NOT NULL, FK → `students.student_id` ON DELETE CASCADE | Associated student                   |
| `best_score`         | DECIMAL(10,2) |                                                      | Best score across all attempts         |
| `average_score`      | DECIMAL(10,2) |                                                      | Average score across attempts          |
| `total_attempts`     | INT           | DEFAULT `0`                                          | Number of attempts made                |
| `last_attempt_at`    | TIMESTAMP     |                                                      | Time of most recent attempt            |
| `first_passed_at`    | TIMESTAMP     |                                                      | Time of first passing attempt          |
| `is_completed`       | BOOLEAN       | DEFAULT `FALSE`                                      | Whether test is fully done             |
| `certificate_issued` | BOOLEAN       | DEFAULT `FALSE`                                      | Whether a certificate was issued       |
| `created_at`         | TIMESTAMP     | DEFAULT NOW()                                        | Record creation time                   |
| `updated_at`         | TIMESTAMP     | DEFAULT NOW()                                        | Last update time                       |

**Unique constraint:** `(test_id, student_id)` — one summary row per student per test

**Indexes:** `idx_results_test`, `idx_results_student`

---

## ENUM Types Reference

| ENUM Name               | Values                                                                            |
|-------------------------|-----------------------------------------------------------------------------------|
| `student_status`        | `Active`, `Inactive`, `Graduated`, `Removed`                                      |
| `student_gender`        | `Male`, `Female`, `Other`                                                         |
| `teacher_status`        | `Active`, `Inactive`, `Retired`                                                   |
| `teacher_gender`        | `Male`, `Female`, `Other`                                                         |
| `superuser_status`      | `Active`, `Inactive`, `Suspended`                                                 |
| `class_status`          | `Active`, `Dropped`, `Graduated`                                                  |
| `payment_frequency`     | `Monthly`, `Quarterly`, `Annual`                                                  |
| `payment_method`        | `Cash`, `Credit Card`, `Bank Transfer`, `Check`, `Digital Wallet`                 |
| `payment_status`        | `Pending`, `Completed`, `Failed`, `Refunded`                                      |
| `fee_frequency`         | `One Time`, `Monthly`, `Quarterly`, `Annual`                                      |
| `registration_status`   | `Pending`, `Partial`, `Paid`, `Overdue`                                           |
| `debt_payment_method`   | `Cash`, `Credit Card`, `Bank Transfer`, `Check`                                   |
| `assignment_status`     | `Pending`, `Submitted`, `Graded`                                                  |
| `test_type`             | `multiple_choice`, `form_filling`, `essay`, `short_answer`, `true_false`, `matching`, `reading_passage`, `writing` |
| `test_assignment_type`  | `all_students`, `specific_students`, `specific_class`, `specific_teacher`         |
| `test_submission_status`| `not_started`, `in_progress`, `submitted`, `graded`, `reviewed`                   |

---

## Foreign Key Relationships

```
edu_centers
├── teachers.center_id
├── superusers.center_id
├── classes.center_id
├── payments.center_id
├── debts.center_id
└── tests.center_id

teachers
├── students.teacher_id
├── classes.teacher_id
├── subjects.teacher_id
├── attendance.teacher_id
└── grades.teacher_id

students
├── attendance.student_id
├── grades.student_id
├── payments.student_id
├── debts.student_id
├── assignment_submissions.student_id
├── test_submissions.student_id
└── test_results_summary.student_id

classes
├── students.class_id
├── subjects.class_id
├── grades.class_id
├── attendance.class_id
└── assignments.class_id → (ON DELETE CASCADE)

assignments
└── assignment_submissions.assignment_id

subjects
└── tests.subject_id → (ON DELETE SET NULL)

tests
├── test_assignments.test_id → (ON DELETE CASCADE)
├── reading_passages.test_id → (ON DELETE CASCADE)
├── test_questions.test_id → (ON DELETE CASCADE)
├── test_submissions.test_id → (ON DELETE CASCADE)
└── test_results_summary.test_id → (ON DELETE CASCADE)

reading_passages
└── test_questions.passage_id → (ON DELETE SET NULL)

test_submissions
└── test_answers.submission_id → (ON DELETE CASCADE)

test_questions
└── test_answers.question_id → (ON DELETE CASCADE)
```

---

## SQL Source Files

| File                          | Contents                                            |
|-------------------------------|-----------------------------------------------------|
| `edu_center.sql`              | `edu_centers` table                                 |
| `students.sql`                | `students` table and enums                          |
| `teachers.sql`                | `teachers` table and enums                          |
| `superuser.sql`               | `superusers` table and enum                         |
| `class.sql`                   | `classes` table and enums                           |
| `subjects.sql`                | `subjects` table                                    |
| `attendance.sql`              | `attendance` table                                  |
| `grades.sql`                  | `grades` table                                      |
| `payments.sql`                | `payments` table and enums                          |
| `finance_management.sql`      | `debts` table and enum                              |
| `assignments.sql`             | `assignments` table and enum                        |
| `assignment_submissions.sql`  | `assignment_submissions` table                      |
| `tests.sql`                   | All test-related tables and enums (7 tables)        |
| `UTILITIES_VIEWS_PROCEDURES.sql` | Reserved for views, functions, and procedures    |
