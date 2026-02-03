# CRM Frontend - Quick Start Guide

## What's Been Created

A fully functional React + Vite + TypeScript CRM (Customer Relationship Management) system frontend with the following features:

### ✅ Implemented Features

1. **React + Vite with TypeScript** - Modern, fast development environment
2. **Redux Toolkit State Management** - Centralized authentication state
3. **Role-Based Access Control (RBAC)** - Superuser, Teacher, and Student roles
4. **Protected Routes** - Only authenticated users can access protected pages
5. **Modular Architecture** - Organized folder structure for scalability
6. **API Integration** - All CRM Backend API endpoints configured
7. **Lazy Loading** - Code splitting for better performance
8. **Responsive Design** - Mobile-friendly UI with green & white theme
9. **Memoization** - Optimized component rendering
10. **Left Sidebar Navigation** - Collapsible menu with role-based filtering

### 📁 Project Structure

```
src/
├── pages/           # All page components (Students, Teachers, Payments, etc.)
├── components/      # Layout and common components (Sidebar, Layout)
├── hooks/          # Custom hooks (useRBAC, useAppDispatch, useAppSelector)
├── slices/         # Redux slices (authSlice)
├── store/          # Redux store configuration
├── services/       # API service layer with all CRM endpoints
├── types/          # TypeScript type definitions
├── utils/          # Helper functions
└── styles/         # Global and component styles
```

### 🔐 Authentication

The application supports three login pages:

1. **Superuser Login** - `/login/superuser`
   - Full access to all features
   - Can manage all modules

2. **Teacher Login** - `/login/teacher`
   - Role-based permissions (CRUD_STUDENT, CRUD_PAYMENT, etc.)
   - Limited access based on assigned roles

3. **Student Login** - `/login/student`
   - View personal information and grades
   - Limited to student-specific pages

### 🚀 Getting Started

#### 1. Start Development Server
The dev server is already running on `http://localhost:5173/`

#### 2. Test Login
Navigate to: `http://localhost:5173/login/superuser`

Try logging in with credentials from your CRM Backend API.

#### 3. Explore the Application
- After login, you'll see the dashboard with a sidebar
- Sidebar shows menu items based on your role and permissions
- Click menu items to navigate between different modules

### 📋 Available Pages/Modules

Once authenticated, you can access:

- **Dashboard** - Overview and quick stats
- **Students** - Student management (all roles can view)
- **Teachers** - Teacher management (superuser only)
- **Classes** - Class management
- **Payments** - Payment tracking
- **Grades** - Academic grades
- **Attendance** - Attendance records
- **Assignments** - Assignment management
- **Subjects** - Subject/Course management
- **Debts** - Debt tracking
- **Centers** - Educational center management (superuser only)

### 🔗 API Configuration

The backend API should be running at: `http://localhost:3000/api`

All API endpoints are defined in `src/services/api.ts`:

```typescript
// Examples:
await studentAPI.getAll();
await teacherAPI.create(teacherData);
await paymentAPI.getByStudent(studentId);
```

### 🎨 Customization

#### Colors
- Primary Green: `#10b981`
- Dark Green: `#059669`
- White: `#ffffff`

To change colors, update the CSS in:
- `src/components/layout/Sidebar.css`
- `src/pages/auth/LoginPage.css`
- `src/App.css`

#### Add New Pages
1. Create a new folder in `src/pages/{moduleName}`
2. Create `{ModuleName}Page.tsx`
3. Add route in `src/App.tsx`
4. Add menu item in `src/components/layout/Sidebar.tsx`

#### Add New Permissions
1. Update `PERMISSION_CODES` in `src/types/index.ts`
2. Update menu filtering in `src/components/layout/Sidebar.tsx`
3. Use `useRBAC()` hook to check permissions

### 🛠️ Build Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Linting
npm run lint
```

### 📱 Responsive Design

- Desktop: Full sidebar visible (280px)
- Tablet/Mobile: Collapsible sidebar with hamburger menu
- Automatically adjusts layout based on screen size

### 🔒 Security Features

1. **Protected Routes** - Unauthorized users redirected to login
2. **Token Storage** - JWT tokens stored in localStorage
3. **Permission Checks** - RBAC validation on every route
4. **User Context** - Current user info in Redux state

### 📚 Key Files to Know

- `src/App.tsx` - Main routing configuration
- `src/slices/authSlice.ts` - Authentication state management
- `src/hooks/useRBAC.ts` - Permission checking logic
- `src/services/api.ts` - All API endpoints
- `src/components/layout/Sidebar.tsx` - Navigation menu

### ⚙️ Next Steps

1. **Implement Data Fetching** - Add useEffect and API calls to pages
2. **Add Forms** - Create forms for creating/editing records
3. **Add Tables** - Display data in data tables
4. **Add Charts** - Integrate charts for analytics
5. **Add Notifications** - Toast notifications for actions
6. **Improve Error Handling** - Better error messages and recovery
7. **Add Validation** - Form validation on client side

### 🐛 Troubleshooting

**Development server not starting?**
```bash
npm install
npm run dev
```

**Build fails?**
```bash
npm run build
```

**Port 5173 already in use?**
```bash
npm run dev -- --port 3000
```

**Backend API not connecting?**
- Ensure backend is running on `http://localhost:3000/api`
- Check API endpoints in `src/services/api.ts`
- Verify CORS is enabled on backend

### 📖 Documentation

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Redux Toolkit](https://redux-toolkit.js.org)
- [React Router](https://reactrouter.com)
- [TypeScript](https://www.typescriptlang.org)

### 💡 Tips

1. Use `useRBAC()` hook to check permissions in components
2. Use `lazy()` for code splitting new pages
3. Use `memo()` to prevent unnecessary re-renders
4. Keep API calls in custom hooks or thunks
5. Use TypeScript for type safety

---

**Happy coding! 🎉**

The application is ready for development. Start building out the data display and form components!
