# Authentication Architecture - Visual Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CRM SYSTEM AUTHENTICATION                        │
└─────────────────────────────────────────────────────────────────────┘

                          Frontend (React Vite)
                    ┌─────────────────────────────┐
                    │   Login Pages               │
                    │  ├─ /login/superuser        │
                    │  ├─ /login/teacher          │
                    │  ├─ /login/student          │
                    │  └─ /login/owner            │
                    └────────────┬────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────┐
                    │   API Service (api.ts)      │
                    │  ├─ authAPI.loginSuperuser()
                    │  ├─ authAPI.loginTeacher()  
                    │  └─ authAPI.loginStudent()  
                    └────────────┬────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
  POST /superusers/        POST /teachers/         POST /students/
  auth/login               auth/login              auth/login
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                    Backend API (Node.js/Express)
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
              Response Parser        Response Parser
                    │                         │
        ┌───────────┼────────┬──────────────┼───────────┐
        │           │        │              │           │
        ▼           ▼        ▼              ▼           ▼
    superuser      token   user           teacher     student
                         data            data        data
```

---

## Data Flow: User Login

```
User Submits Form
       │
       ▼
Determine User Type
       │
  ┌────┼────┬─────────┐
  │    │    │         │
  ▼    ▼    ▼         ▼
 SUP  TCH  STU       OWN
  │    │    │         │
  │    │    │    (Hardcoded)
  │    │    │         │
  └────┴────┴─────────┘
       │
       ▼
Send Credentials
       │
       ▼
API Request
       │
       ▼
Backend Authentication
       │
  ┌────┴──────┐
  │           │
  ▼           ▼
Success     Error
  │           │
  ▼           ▼
Response   Error
  │      Response
  ▼           │
Parse       Toast
  │      Error
  ▼           │
Extract     Stay on
Data        Login
  │
  ▼
Redux Store
  │
  ├─ user object
  ├─ token
  └─ isAuthenticated
  │
  ▼
LocalStorage
  │
  ├─ token
  └─ user JSON
  │
  ▼
Toast Success
  │
  ▼
Navigate Dashboard
```

---

## State Management Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      Redux Store                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  auth: {                                                      │
│    user: {                                                    │
│      id: number,                                             │
│      username: string,                                       │
│      email: string,                                          │
│      first_name: string,                                     │
│      last_name: string,                                      │
│      role: string,                                           │
│      roles?: string[],  ← Teachers only                       │
│      userType: 'superuser' | 'teacher' | 'student',         │
│      center_id: number                                       │
│    },                                                         │
│    isAuthenticated: boolean,                                 │
│    loading: boolean,                                         │
│    error: string | null                                      │
│  }                                                            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Tree

```
App
├── ToastContainer (notifications)
├── BrowserRouter
│   └── Routes
│       ├── /login/superuser → LoginPage (userType='superuser')
│       ├── /login/teacher → LoginPage (userType='teacher')
│       ├── /login/student → LoginPage (userType='student')
│       ├── /login/owner → OwnerLoginPage
│       ├── /owner/manage → OwnerManager (ProtectedRoute)
│       ├── /dashboard → Dashboard (ProtectedRoute)
│       └── Protected Routes
│           ├── /students
│           ├── /teachers
│           ├── /payments
│           ├── /grades
│           ├── /attendance
│           ├── /classes
│           ├── /centers
│           ├── /debts
│           ├── /assignments
│           └── /subjects
```

---

## Authentication Flow by User Type

### Superuser Flow
```
┌──────────┐
│ Superuser│
│  Login   │
└────┬─────┘
     │ username + password
     ▼
POST /superusers/auth/login
     │
     ▼ { superuser, token }
┌─────────────────────────┐
│ Response Processing     │
│ - Extract superuser_id  │
│ - Map to AuthUser       │
│ - Store token           │
│ - Set userType='su'     │
└────────┬────────────────┘
         │
         ▼
    Dashboard
    ├─ All Menus Visible
    └─ Full System Access
```

### Teacher Flow
```
┌──────────┐
│ Teacher  │
│  Login   │
└────┬─────┘
     │ username + password
     ▼
POST /teachers/auth/login
     │
     ▼ { teacher, token }
┌────────────────────────────┐
│ Response Processing        │
│ - Extract teacher_id       │
│ - Map to AuthUser          │
│ - Preserve roles array     │
│ - Store token              │
│ - Set userType='teacher'   │
└────────┬───────────────────┘
         │
         ▼
    Dashboard
    ├─ Filtered Menus
    │ (by roles)
    └─ Role-based Access
```

### Student Flow
```
┌──────────┐
│ Student  │
│  Login   │
└────┬─────┘
     │ username + password
     ▼
POST /students/auth/login
     │
     ▼ { student, token }
┌────────────────────────────┐
│ Response Processing        │
│ - Extract student_id       │
│ - Map to AuthUser          │
│ - Set role='student'       │
│ - Store token              │
│ - Set userType='student'   │
└────────┬───────────────────┘
         │
         ▼
    Dashboard
    ├─ Student Menus
    │ ├─ My Grades
    │ ├─ My Assignments
    │ └─ My Attendance
    └─ Limited Access
```

---

## Error Handling Path

```
API Call
  │
  ├─ Success (200)
  │  ├─ Show success toast
  │  ├─ Store data
  │  └─ Navigate dashboard
  │
  └─ Error (4xx/5xx)
     ├─ Extract error message
     ├─ Update error state
     ├─ Show error toast
     ├─ Log in console
     └─ Stay on login page
        ├─ Show error message
        └─ Allow retry
```

---

## Token Lifecycle

```
┌─────────────────────────────────────────────────────┐
│             Token Lifecycle                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1. Generate on Login                               │
│    └─ Backend generates JWT/Token                  │
│                                                     │
│ 2. Store                                            │
│    ├─ Redux state (runtime)                        │
│    └─ LocalStorage (persistence)                   │
│                                                     │
│ 3. Include in Requests                             │
│    └─ Authorization: Bearer {token}                │
│       (Added by axios interceptor)                 │
│                                                     │
│ 4. Validate on Each Request                        │
│    ├─ Backend checks token                         │
│    ├─ Valid → Continue                             │
│    └─ Invalid → Return 401                         │
│                                                     │
│ 5. Clear on Logout                                 │
│    ├─ Remove from Redux                            │
│    └─ Remove from LocalStorage                     │
│                                                     │
│ 6. Refresh on Startup (if needed)                  │
│    └─ Check localStorage for token                 │
│       ├─ Found → Restore session                   │
│       └─ Not found → Show login                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## API Interceptor Chain

```
Request
  │
  ▼
Request Interceptor
  ├─ Add Authorization header
  ├─ Get token from localStorage
  └─ Add to request
  │
  ▼
Send to Backend
  │
  ▼
Response
  │
  ├─ Success Response
  │  └─ Response Interceptor
  │     ├─ For POST/PUT/DELETE
  │     └─ Show success toast
  │
  └─ Error Response
     └─ Error Interceptor
        ├─ Extract error message
        └─ Show error toast
```

---

## RBAC (Role-Based Access Control)

```
┌────────────────────────────────────────┐
│         useRBAC Hook                   │
├────────────────────────────────────────┤
│                                        │
│ Input: permission code (e.g., 'CRUD_STUDENT')
│                                        │
├─ Check user type                       │
│  ├─ if superuser → return true         │
│  ├─ if teacher                         │
│  │  └─ Check roles array               │
│  │     ├─ 'CRUD_STUDENT' in roles      │
│  │     ├─ 'CRUD_TEACHER' in roles      │
│  │     └─ etc.                         │
│  └─ if student → return false          │
│                                        │
└────────────────────────────────────────┘
         │
         ▼
    Component Visibility
    ├─ Menu items filtered
    ├─ Routes protected
    └─ Features enabled/disabled
```

---

## Toast Notification System

```
API Response
  │
  ├─ Success Response
  │  └─ showToast.success(message)
  │     ├─ Position: top-right
  │     ├─ Duration: 3 seconds
  │     ├─ Auto-close: true
  │     └─ Dismissible: true
  │
  └─ Error Response
     └─ showToast.error(message)
        ├─ Position: top-right
        ├─ Duration: 4 seconds
        ├─ Auto-close: true
        └─ Dismissible: true
```

---

## Summary

✅ Complete authentication system with three user types
✅ Proper separation of concerns
✅ TypeScript type safety throughout
✅ Redux state management
✅ Token persistence in localStorage
✅ Comprehensive error handling
✅ User feedback via toast notifications
✅ Role-based access control
✅ Protected routes with ProtectedRoute component
✅ Responsive and accessible UI
