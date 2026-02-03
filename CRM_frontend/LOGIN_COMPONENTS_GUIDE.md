# Login Components - Updated for API Documentation

## Overview
The login components have been updated to match the API documentation with three separate authentication endpoints.

## Authentication Endpoints

### 1. Superuser Login
- **Endpoint**: `POST /superusers/auth/login`
- **Request**:
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
    "role": "Admin",
    "center_id": 1
  },
  "token": "JWT_TOKEN"
}
```

### 2. Teacher Login
- **Endpoint**: `POST /teachers/auth/login`
- **Request**:
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
    "email": "jane@example.com",
    "roles": ["teacher", "mentor"],
    "center_id": 1
  },
  "token": "JWT_TOKEN"
}
```

### 3. Student Login
- **Endpoint**: `POST /students/auth/login`
- **Request**:
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
    "email": "john@example.com",
    "center_id": 1
  },
  "token": "JWT_TOKEN"
}
```

## Implementation Details

### API Service (src/services/api.ts)
```typescript
export const authAPI = {
  loginSuperuser: (credentials: { username: string; password: string }) =>
    superuserAPI.login(credentials),
  loginTeacher: (credentials: { username: string; password: string }) =>
    apiClient.post('/teachers/auth/login', credentials),
  loginStudent: (credentials: { username: string; password: string }) =>
    apiClient.post('/students/auth/login', credentials),
};
```

### Login Flow
1. User selects login type (Superuser, Teacher, or Student)
2. User enters username and password
3. Component determines which API endpoint to call based on `userType` prop
4. Response is mapped to unified AuthUser interface
5. User data and token stored in Redux state and localStorage
6. Success/error toasts shown to user

### Features
✅ Three separate login endpoints per API documentation
✅ Response mapping for each user type
✅ Token extraction and storage
✅ Role-based access control (teachers have roles array)
✅ Toast notifications for success/error
✅ Type-safe with TypeScript

### Login Page Routes
- `/login/superuser` - Superuser/Admin login
- `/login/teacher` - Teacher login
- `/login/student` - Student login
- `/login/owner` - Owner/Manager login (hardcoded credentials)

### User Data Mapping

#### Superuser Response → AuthUser
```
superuser_id → id
username → username
email → email
first_name → first_name
last_name → last_name
role → role
userType → 'superuser'
center_id → center_id
```

#### Teacher Response → AuthUser
```
teacher_id → id
(username param) → username
email → email
first_name → first_name
last_name → last_name
roles → roles (array of role codes like 'CRUD_STUDENT')
userType → 'teacher'
center_id → center_id
```

#### Student Response → AuthUser
```
student_id → id
(username param) → username
email → email
first_name → first_name
last_name → last_name
role → 'student'
userType → 'student'
center_id → center_id
```

## Role-Based Access Control (RBAC)

Based on the API documentation, teachers have a `roles` field that includes permission codes:
- `CRUD_STUDENT` - Can manage students
- `CRUD_TEACHER` - Can manage teachers
- etc.

The useRBAC hook checks these permissions:
```typescript
const canAccess = (permission: string): boolean => {
  if (user?.userType === 'superuser') return true;
  if (user?.userType === 'teacher' && user?.roles) {
    return user.roles.includes(permission);
  }
  return false;
};
```

## Testing

### Test Superuser Login
- URL: `http://localhost:5173/login/superuser`
- Endpoint will be called: `POST /superusers/auth/login`
- Expected response includes `superuser` object

### Test Teacher Login
- URL: `http://localhost:5173/login/teacher`
- Endpoint will be called: `POST /teachers/auth/login`
- Expected response includes `teacher` object with `roles` array

### Test Student Login
- URL: `http://localhost:5173/login/student`
- Endpoint will be called: `POST /students/auth/login`
- Expected response includes `student` object

## Error Handling
- API errors are caught and displayed as toast notifications
- Error messages extracted from API response
- Loading states managed during authentication
- Token is stored in localStorage for persistence
