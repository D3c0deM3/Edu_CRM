# CRM Frontend - React + Vite + TypeScript

A modern, responsive Customer Relationship Management (CRM) system frontend built with React, Vite, TypeScript, Redux Toolkit, and Tailored CSS.

## Features

- ✅ **React + Vite** - Fast development and build experience
- ✅ **TypeScript** - Type-safe development
- ✅ **Redux Toolkit** - State management
- ✅ **React Router** - Client-side routing
- ✅ **Role-Based Access Control (RBAC)** - Secure access management
- ✅ **Lazy Loading** - Code splitting for performance optimization
- ✅ **Responsive Design** - Mobile-friendly UI
- ✅ **Green & White Theme** - Modern and clean design
- ✅ **Modular Structure** - Organized and scalable codebase

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── common/         # Common components (ProtectedRoute, etc.)
│   ├── layout/         # Layout components (Sidebar, Layout)
│   └── index.ts        # Export components
├── hooks/              # Custom React hooks
│   ├── useAppDispatch.ts
│   ├── useAppSelector.ts
│   ├── useRBAC.ts      # Role-based access control hook
│   └── index.ts
├── pages/              # Page components
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard page
│   ├── students/       # Students management
│   ├── teachers/       # Teachers management
│   ├── payments/       # Payments management
│   ├── grades/         # Grades management
│   ├── attendance/     # Attendance management
│   ├── classes/        # Classes management
│   ├── centers/        # Centers management
│   ├── debts/          # Debts management
│   ├── assignments/    # Assignments management
│   └── subjects/       # Subjects management
├── services/           # API service layer
│   └── api.ts          # API client and endpoints
├── slices/             # Redux slices
│   └── authSlice.ts    # Authentication state
├── store/              # Redux store
│   └── index.ts        # Store configuration
├── styles/             # Global styles
├── types/              # TypeScript type definitions
│   └── index.ts        # All types
├── utils/              # Utility functions
│   └── helpers.ts      # Helper functions
├── App.tsx             # Main App component
├── App.css             # App styles
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Navigate to the project directory:**
```bash
cd CRM_frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Available Routes

### Authentication Routes
- `/login/superuser` - Superuser login
- `/login/teacher` - Teacher login
- `/login/student` - Student login

### Protected Routes (Require Authentication)
- `/dashboard` - Main dashboard
- `/students` - Students management
- `/teachers` - Teachers management (Superuser only)
- `/payments` - Payments management
- `/grades` - Grades management
- `/attendance` - Attendance management
- `/classes` - Classes management
- `/centers` - Centers management (Superuser only)
- `/debts` - Debts management
- `/assignments` - Assignments management
- `/subjects` - Subjects management

## Authentication

The application supports three types of users:
1. **Superuser** - Full access to all features
2. **Teacher** - Limited access based on role permissions
3. **Student** - Access to personal student information and grades

### Login Flow
- Users navigate to their respective login page
- Credentials are validated against the CRM Backend API
- Upon successful login, JWT token is stored in localStorage
- User information is stored in Redux state
- Protected routes check authentication and redirect to login if not authenticated

## Role-Based Access Control (RBAC)

Teachers have role codes that determine their permissions:
- `CRUD_STUDENT` - Can manage students
- `CRUD_TEACHER` - Can manage teachers
- `CRUD_CLASS` - Can manage classes
- `CRUD_PAYMENT` - Can manage payments
- `CRUD_GRADE` - Can manage grades
- `CRUD_ATTENDANCE` - Can manage attendance
- `CRUD_ASSIGNMENT` - Can manage assignments
- `CRUD_SUBJECT` - Can manage subjects
- `CRUD_DEBT` - Can manage debts
- `CRUD_CENTER` - Can manage centers

Use the `useRBAC()` hook to check permissions in components:

```typescript
import { useRBAC } from './hooks';

function MyComponent() {
  const { canAccess, hasRole } = useRBAC();

  if (!canAccess('CRUD_STUDENT')) {
    return <div>Access Denied</div>;
  }

  return <div>Student Management</div>;
}
```

## API Integration

The application connects to the CRM Backend API at `http://localhost:3000/api`.

All API endpoints are organized in `/src/services/api.ts`:

```typescript
import { studentAPI, teacherAPI, paymentAPI } from './services/api';

// Get all students
const students = await studentAPI.getAll();

// Get student by ID
const student = await studentAPI.getById(1);

// Create student
const newStudent = await studentAPI.create(studentData);

// Update student
await studentAPI.update(1, updatedData);

// Delete student
await studentAPI.delete(1);
```

## State Management with Redux

Redux Toolkit is used for state management. The main store includes:

- **Auth Slice** - Authentication state (user, token, loading)

Example usage:

```typescript
import { useAppDispatch, useAppSelector } from './hooks';
import { loginSuccess, logout } from './slices/authSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector(state => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  return <div>{user?.first_name}</div>;
}
```

## Performance Optimization

### 1. Code Splitting with Lazy Loading
All page components are lazy-loaded using React.lazy() to reduce initial bundle size:

```typescript
const StudentsPage = lazy(() => import('./pages/students/StudentsPage'));
```

### 2. Memoization
Components use React.memo() to prevent unnecessary re-renders:

```typescript
const Dashboard = memo(({ children }: LayoutProps) => {
  // Component logic
});
```

### 3. Responsive Design
The sidebar is responsive and collapses on mobile devices with a hamburger menu.

## Styling

The application uses a clean green and white color scheme:
- Primary Green: `#10b981`
- Dark Green: `#059669`
- White: `#ffffff`
- Light Gray: `#f5f5f5`

All components have CSS files in the same directory for organization and scoping.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Contributing

1. Follow the existing project structure
2. Use TypeScript for all new files
3. Create components with proper type definitions
4. Add custom hooks in the `/hooks` directory
5. Keep components modular and reusable
6. Use CSS modules or component-scoped CSS

## License

This project is part of the CRM System and is for educational purposes.

## Support

For issues or questions, please contact the development team.

---

**Built with ❤️ using React + Vite + TypeScript**
