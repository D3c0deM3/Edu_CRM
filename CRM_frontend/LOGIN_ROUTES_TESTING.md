# Login Routes - Ready to Test

## Available Login Routes

### 1. Superuser/Admin Login
**URL**: `http://localhost:5173/login/superuser`

**API Endpoint**: `POST http://localhost:3000/api/superusers/auth/login`

**Test Credentials** (from API documentation):
```json
{
  "username": "admin",
  "password": "securePassword123"
}
```

**Expected Response**:
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
  },
  "token": "JWT_TOKEN_HERE"
}
```

**Access Level**: Full system access to all modules

---

### 2. Teacher Login
**URL**: `http://localhost:5173/login/teacher`

**API Endpoint**: `POST http://localhost:3000/api/teachers/auth/login`

**Test Credentials** (create test teacher first):
```json
{
  "username": "teacher_username",
  "password": "password"
}
```

**Expected Response**:
```json
{
  "message": "Login successful",
  "teacher": {
    "teacher_id": 1,
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "roles": ["teacher", "mentor"]
  },
  "token": "JWT_TOKEN_HERE"
}
```

**Access Level**: Role-based access (check roles array for permissions)
- Can see: Students, Grades, Classes, Attendance, Assignments, Subjects
- Cannot see: Teachers, Centers, Superusers

---

### 3. Student Login
**URL**: `http://localhost:5173/login/student`

**API Endpoint**: `POST http://localhost:3000/api/students/auth/login`

**Test Credentials** (create test student first):
```json
{
  "username": "student_username",
  "password": "password"
}
```

**Expected Response**:
```json
{
  "message": "Login successful",
  "student": {
    "student_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
  },
  "token": "JWT_TOKEN_HERE"
}
```

**Access Level**: Student-only access
- Can see: My Grades, My Assignments, My Attendance
- Cannot see: Other modules

---

### 4. Owner/Manager Login (Hardcoded)
**URL**: `http://localhost:5173/login/owner`

**Credentials**:
```
Username: Muzaffar
Password: 123456789
```

**Access Level**: Full system administration
- Redirect to: `/owner/manage`
- Can access: Owner Manager Panel
- Functions: Create/Update/Delete Centers, Superusers, Teachers, Students

---

## Login Flow Diagram

```
┌─────────────────────────────────────────┐
│         CRM System Login                │
└─────────────────────────────────────────┘
                    ↓
         ┌──────────┼──────────┐
         ↓          ↓          ↓
    Superuser   Teacher    Student
         ↓          ↓          ↓
    /superusers/auth/login
    /teachers/auth/login
    /students/auth/login
         ↓          ↓          ↓
    Parse Response
         ↓          ↓          ↓
    Store in Redux + LocalStorage
         ↓          ↓          ↓
    Show Toast Success
         ↓          ↓          ↓
    Navigate to Dashboard
```

## Implementation Details

### Component Location
- **LoginPage Component**: `src/pages/auth/LoginPage.tsx`
- **LoginPage Styles**: `src/pages/auth/LoginPage.css`
- **OwnerLoginPage Component**: `src/pages/auth/OwnerLoginPage.tsx`

### API Service Location
- **Auth API**: `src/services/api.ts`
- **Toast Utils**: `src/utils/toast.ts`

### State Management
- **Auth Slice**: `src/slices/authSlice.ts`
- **Store**: `src/store/index.ts`
- **Hooks**: `src/hooks/useRBAC.ts`

## Testing Checklist

### Superuser Login Testing
- [ ] Navigate to `/login/superuser`
- [ ] Enter admin credentials
- [ ] Verify success toast appears
- [ ] Verify redirect to dashboard
- [ ] Verify "Superuser" shown in sidebar
- [ ] Verify all menu items visible
- [ ] Test logout and verify redirect to login

### Teacher Login Testing
- [ ] Navigate to `/login/teacher`
- [ ] Enter valid teacher credentials
- [ ] Verify success toast appears
- [ ] Verify redirect to dashboard
- [ ] Verify "Teacher" shown in sidebar
- [ ] Verify menu shows only teacher-accessible items
- [ ] Test permission-based menu filtering

### Student Login Testing
- [ ] Navigate to `/login/student`
- [ ] Enter valid student credentials
- [ ] Verify success toast appears
- [ ] Verify redirect to dashboard
- [ ] Verify "Student" shown in sidebar
- [ ] Verify only student modules visible
- [ ] Test student-specific views

### Error Testing
- [ ] Test invalid username
- [ ] Test invalid password
- [ ] Test empty fields
- [ ] Test network timeout
- [ ] Verify error toast appears
- [ ] Verify clear error messages
- [ ] Verify form remains visible after error

### Owner Testing
- [ ] Navigate to `/login/owner`
- [ ] Enter: Username "Muzaffar", Password "123456789"
- [ ] Verify success toast appears
- [ ] Verify redirect to `/owner/manage`
- [ ] Test creating new superuser
- [ ] Test creating new teacher
- [ ] Test creating new student
- [ ] Test updating records
- [ ] Test deleting records

## Token Management

### Token Storage
```typescript
// Token stored in localStorage for persistence
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));

// Token included in all API requests
Authorization: Bearer <token>

// Token cleared on logout
localStorage.removeItem('token');
localStorage.removeItem('user');
```

## Security Notes

⚠️ **Important**: 
- Tokens stored in localStorage (vulnerable to XSS)
- In production, consider using httpOnly cookies
- Owner credentials are hardcoded (for demo purposes only)
- In production, implement proper authentication
- All passwords should be transmitted over HTTPS only

## Next Steps

1. Create test data for Teachers and Students via Owner Manager
2. Test login with created credentials
3. Verify RBAC working correctly
4. Test permission-based menu filtering
5. Verify all toasts showing correctly
6. Test error scenarios
7. Test logout functionality
