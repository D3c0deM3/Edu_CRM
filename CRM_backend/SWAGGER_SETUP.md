# Swagger/OpenAPI Setup Complete ✅

## Access Swagger UI

Visit: **http://localhost:3000/docs**

When you run the server with `npm run dev`, you can access the interactive Swagger UI documentation at the `/docs` endpoint.

---

## What's Included

✅ **Interactive API Documentation** - Full OpenAPI 3.0 specification
✅ **Try It Out Feature** - Test all endpoints directly from the browser
✅ **Request/Response Examples** - See all data models and schemas
✅ **Authentication Support** - Ready for Bearer token implementation

---

## Endpoints Documented

### Students (`/api/students`)
- `GET /` - Get all students
- `GET /{id}` - Get student by ID
- `POST /` - Create student
- `PUT /{id}` - Update student
- `DELETE /{id}` - Delete student

### Teachers (`/api/teachers`)
- `GET /` - Get all teachers
- `GET /{id}` - Get teacher by ID
- `POST /` - Create teacher
- `PUT /{id}` - Update teacher
- `DELETE /{id}` - Delete teacher

### Classes (`/api/classes`)
- `GET /` - Get all classes
- `GET /{id}` - Get class by ID
- `POST /` - Create class
- `PUT /{id}` - Update class
- `DELETE /{id}` - Delete class

### Centers (`/api/centers`)
- `GET /` - Get all centers
- `GET /{id}` - Get center by ID
- `POST /` - Create center
- `PUT /{id}` - Update center
- `DELETE /{id}` - Delete center

### Payments (`/api/payments`)
- `GET /` - Get all payments
- `GET /{id}` - Get payment by ID
- `GET /student/{studentId}` - Get payments by student
- `POST /` - Create payment
- `PUT /{id}` - Update payment

### Debts (`/api/debts`)
- `GET /` - Get all debts
- `GET /{id}` - Get debt by ID
- `GET /student/{studentId}` - Get debts by student
- `POST /` - Create debt
- `PUT /{id}` - Update debt

### Grades (`/api/grades`)
- `GET /` - Get all grades
- `GET /{id}` - Get grade by ID
- `GET /student/{studentId}` - Get grades by student
- `POST /` - Create grade
- `PUT /{id}` - Update grade

### Attendance (`/api/attendance`)
- `GET /` - Get all attendance records
- `GET /{id}` - Get attendance by ID
- `GET /student/{studentId}` - Get attendance by student
- `GET /class/{classId}` - Get attendance by class
- `POST /` - Create attendance record
- `PUT /{id}` - Update attendance

### Assignments (`/api/assignments`)
- `GET /` - Get all assignments
- `GET /{id}` - Get assignment by ID
- `POST /` - Create assignment
- `PUT /{id}` - Update assignment
- `DELETE /{id}` - Delete assignment

---

## Data Schemas Available

All endpoints use standardized schemas:
- `Student` - Student information
- `Teacher` - Teacher information
- `Class` - Class details
- `Center` - Educational center
- `Payment` - Payment records
- `Debt` - Debt tracking
- `Grade` - Student grades
- `Attendance` - Attendance records
- `Assignment` - Assignment information

---

## Features

### Try It Out
Every endpoint in Swagger UI has a **"Try it out"** button that lets you:
- Enter parameters and request body
- Execute the request
- See the response

### Response Codes
All endpoints document:
- `200` - Successful GET/PUT
- `201` - Successful POST (Created)
- `404` - Not Found
- `400` - Bad Request
- `500` - Server Error

### Server Information
```
Development: http://localhost:3000/api
Production: https://api.crm.com/api (placeholder)
```

---

## Starting the Server

```bash
npm run dev
```

Then visit: **http://localhost:3000/docs**

Enjoy your interactive API documentation! 🎉
