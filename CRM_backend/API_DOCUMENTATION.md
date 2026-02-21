# CRM Backend - API Documentation

## Overview

Complete CRM (Customer Relationship Management) Backend with 11 modules for managing educational institutions.

### Available Modules
1. **Students** - Student enrollment and information management
2. **Teachers** - Teacher profiles and assignments
3. **Classes** - Class management and configuration
4. **Centers** - Educational center/institution management
5. **Payments** - Student payment tracking and records
6. **Debts** - Student debt management and tracking
7. **Grades** - Academic grade recording and management
8. **Attendance** - Attendance tracking and reporting
9. **Assignments** - Assignment creation and submission tracking
10. **Subjects** - Subject/Course management with marking schemes
11. **Superusers** - Admin authentication and account management

## Base URL
```
http://localhost:3000/api
```

## Health Check
- **GET** `/health` - Check server status
- **Response**: `{ "status": "OK", "message": "CRM Backend Server is running" }`

---

## STUDENTS

### Get All Students
- **GET** `/students`
- **Response**: Array of student objects

### Get Student by ID
- **GET** `/students/:id`
- **Response**: Single student object

### Create Student
- **POST** `/students`
- **Body**:
```json
{
  "center_id": 1,
  "enrollment_number": "STU001",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "date_of_birth": "2000-01-15",
  "parent_name": "Jane Doe",
  "parent_phone": "0987654321",
  "gender": "Male",
  "status": "Active",
  "teacher_id": 1,
  "class_id": 1
}
```

### Update Student
- **PUT** `/students/:id`
- **Body**: (partial update allowed)
```json
{
  "first_name": "Johnny",
  "email": "johnny@example.com",
  "status": "Active"
}
```

### Delete Student
- **DELETE** `/students/:id`

### Student Authentication

#### Student Login
- **POST** `/students/auth/login`
- **Body**:
```json
{
  "username": "student_username",
  "password": "password"
}
```
- **Response**: 
```json
{
  "message": "Login successful",
  "student": {
    "student_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
  }
}
```

#### Set Student Password (Admin Operation)
- **POST** `/students/:id/set-password`
- **Body**:
```json
{
  "username": "student_username",
  "password": "new_password"
}
```

#### Change Student Password
- **POST** `/students/:id/change-password`
- **Body**:
```json
{
  "old_password": "current_password",
  "new_password": "new_password"
}
```

---

## TEACHERS

### Get All Teachers
- **GET** `/teachers`

### Get Teacher by ID
- **GET** `/teachers/:id`

### Create Teacher
- **POST** `/teachers`
- **Body**:
```json
{
  "center_id": 1,
  "employee_id": "EMP001",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "1111111111",
  "date_of_birth": "1985-06-20",
  "gender": "Female",
  "qualification": "B.Tech",
  "specialization": "Mathematics",
  "status": "Active",
  "roles": ["teacher", "mentor"]
}
```

### Update Teacher
- **PUT** `/teachers/:id`

### Delete Teacher
- **DELETE** `/teachers/:id`

### Teacher Authentication

#### Teacher Login
- **POST** `/teachers/auth/login`
- **Body**:
```json
{
  "username": "teacher_username",
  "password": "password"
}
```
- **Response**: 
```json
{
  "message": "Login successful",
  "teacher": {
    "teacher_id": 1,
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com"
  }
}
```

#### Set Teacher Password (Admin Operation)
- **POST** `/teachers/:id/set-password`
- **Body**:
```json
{
  "username": "teacher_username",
  "password": "new_password"
}
```

#### Change Teacher Password
- **POST** `/teachers/:id/change-password`
- **Body**:
```json
{
  "old_password": "current_password",
  "new_password": "new_password"
}
```

---

## CLASSES

### Get All Classes
- **GET** `/classes`

### Get Class by ID
- **GET** `/classes/:id`

### Create Class
- **POST** `/classes`
- **Body**:
```json
{
  "center_id": 1,
  "class_name": "10-A",
  "class_code": "CLASS10A",
  "level": 10,
  "section": "A",
  "capacity": 50,
  "teacher_id": 1,
  "room_number": "101",
  "payment_amount": 5000,
  "payment_frequency": "Monthly"
}
```

### Update Class
- **PUT** `/classes/:id`

### Delete Class
- **DELETE** `/classes/:id`

---

## CENTERS (Educational Centers)

### Get All Centers
- **GET** `/centers`

### Get Center by ID
- **GET** `/centers/:id`

### Create Center
- **POST** `/centers`
- **Body**:
```json
{
  "center_name": "ABC School",
  "center_code": "ABC001",
  "email": "info@abc.com",
  "phone": "2222222222",
  "address": "123 Main St",
  "city": "New York",
  "principal_name": "Dr. Principal"
}
```

### Update Center
- **PUT** `/centers/:id`

### Delete Center
- **DELETE** `/centers/:id`

---

## PAYMENTS

### Get All Payments
- **GET** `/payments`

### Get Payment by ID
- **GET** `/payments/:id`

### Get Payments by Student
- **GET** `/payments/student/:studentId`

### Create Payment
- **POST** `/payments`
- **Body**:
```json
{
  "student_id": 1,
  "center_id": 1,
  "payment_date": "2024-01-20",
  "amount": 5000,
  "currency": "USD",
  "payment_method": "Cash",
  "transaction_reference": "TXN123456",
  "receipt_number": "RCP001",
  "payment_status": "Completed",
  "payment_type": "Tuition",
  "notes": "Monthly tuition payment"
}
```

### Update Payment
- **PUT** `/payments/:id`
- **Body**:
```json
{
  "payment_status": "Completed",
  "notes": "Payment received"
}
```

---

## DEBTS

### Get All Debts
- **GET** `/debts`

### Get Debt by ID
- **GET** `/debts/:id`

### Get Debts by Student
- **GET** `/debts/student/:studentId`

### Create Debt
- **POST** `/debts`
- **Body**:
```json
{
  "student_id": 1,
  "center_id": 1,
  "debt_amount": 10000,
  "debt_date": "2024-01-01",
  "due_date": "2024-02-01",
  "amount_paid": 5000,
  "remarks": "Outstanding balance"
}
```

### Update Debt
- **PUT** `/debts/:id`
- **Body**:
```json
{
  "amount_paid": 8000,
  "remarks": "Partial payment made"
}
```

---

## GRADES

### Get All Grades
- **GET** `/grades`

### Get Grade by ID
- **GET** `/grades/:id`

### Get Grades by Student
- **GET** `/grades/student/:studentId`

### Create Grade
- **POST** `/grades`
- **Body**:
```json
{
  "student_id": 1,
  "teacher_id": 1,
  "subject": "Mathematics",
  "class_id": 1,
  "marks_obtained": 85,
  "total_marks": 100,
  "percentage": 85.0,
  "grade_letter": "A",
  "academic_year": 2024,
  "term": "First"
}
```

### Update Grade
- **PUT** `/grades/:id`
- **Body**:
```json
{
  "marks_obtained": 88,
  "percentage": 88.0,
  "grade_letter": "A"
}
```

---

## ATTENDANCE

### Get All Attendance Records
- **GET** `/attendance`

### Get Attendance by ID
- **GET** `/attendance/:id`

### Get Attendance by Student
- **GET** `/attendance/student/:studentId`

### Get Attendance by Class
- **GET** `/attendance/class/:classId`

### Create Attendance Record
- **POST** `/attendance`
- **Body**:
```json
{
  "student_id": 1,
  "teacher_id": 1,
  "class_id": 1,
  "attendance_date": "2024-01-20",
  "status": "Present",
  "remarks": "On time"
}
```

### Update Attendance
- **PUT** `/attendance/:id`
- **Body**:
```json
{
  "status": "Present",
  "remarks": "Present"
}
```

---

## ASSIGNMENTS

### Get All Assignments
- **GET** `/assignments`

### Get Assignment by ID
- **GET** `/assignments/:id`

### Create Assignment
- **POST** `/assignments`
- **Body**:
```json
{
  "class_id": 1,
  "assignment_title": "Algebra Assignment",
  "description": "Complete chapter 5 exercises",
  "due_date": "2024-02-01",
  "submission_date": "2024-01-31",
  "status": "Pending"
}
```

### Update Assignment
- **PUT** `/assignments/:id`
- **Body**:
```json
{
  "status": "Graded",
  "grade": 85.5
}
```

### Delete Assignment
- **DELETE** `/assignments/:id`

---

## Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

---

## SUBJECTS

### Get All Subjects
- **GET** `/subjects`
- **Response**: Array of subject objects

### Get Subject by ID
- **GET** `/subjects/:id`
- **Response**: Single subject object

### Get Subjects by Class
- **GET** `/subjects/class/:classId`
- **Response**: Array of subjects for a specific class

### Create Subject
- **POST** `/subjects`
- **Body**:
```json
{
  "class_id": 1,
  "subject_name": "Mathematics",
  "subject_code": "MATH101",
  "teacher_id": 1,
  "total_marks": 100,
  "passing_marks": 40
}
```

### Update Subject
- **PUT** `/subjects/:id`
- **Body**: (partial update allowed)
```json
{
  "subject_name": "Advanced Mathematics",
  "teacher_id": 2,
  "passing_marks": 50
}
```

### Delete Subject
- **DELETE** `/subjects/:id`

---

## SUPERUSERS

### Get All Superusers
- **GET** `/superusers`
- **Response**: Array of superuser objects

### Get Superuser by ID
- **GET** `/superusers/:id`
- **Response**: Single superuser object

### Create Superuser
- **POST** `/superusers`
- **Body**:
```json
{
  "center_id": 1,
  "username": "admin",
  "email": "admin@crm.com",
  "password": "securePassword123",
  "first_name": "Admin",
  "last_name": "User",
  "role": "Admin",
  "permissions": {
    "manage_students": true,
    "manage_teachers": true,
    "manage_payments": true
  },
  "status": "Active"
}
```

### Update Superuser
- **PUT** `/superusers/:id`
- **Body**: (partial update allowed)
```json
{
  "email": "newemail@crm.com",
  "role": "Manager",
  "status": "Active"
}
```

### Delete Superuser
- **DELETE** `/superusers/:id`

### Superuser Login
- **POST** `/superusers/auth/login`
- **Body**:
```json
{
  "username": "admin",
  "password": "securePassword123"
}
```
- **Response**:
```json
{
  "message": "Login successful",
  "superuser": {
    "superuser_id": 1,
    "username": "admin",
    "email": "admin@crm.com",
    "first_name": "Admin",
    "last_name": "User",
    "role": "Admin"
  }
}
```

### Change Superuser Password
- **POST** `/superusers/:id/change-password`
- **Body**:
```json
{
  "old_password": "securePassword123",
  "new_password": "newSecurePassword456"
}
```

---

## SWAGGER/OPENAPI DOCUMENTATION

### Interactive API Documentation
- **URL**: `http://localhost:3000/docs`
- Access the interactive Swagger UI where you can:
  - View all available endpoints
  - See request/response schemas
  - Test API endpoints directly
  - View error codes and descriptions

---

## Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

---

## Database Schema

### Tables
- `students` - Student information
- `teachers` - Teacher information
- `classes` - Class information
- `edu_centers` - Educational center information
- `payments` - Payment records
- `debts` - Debt records
- `grades` - Grade records
- `attendance` - Attendance records
- `assignments` - Assignment information
- `assignment_submissions` - Assignment submission tracking
- `subjects` - Subject/Course information
- `superusers` - Admin/Superuser accounts with authentication

---

## Environment Variables

```
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<your_password>
DB_NAME=crm_db
```

---

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```
