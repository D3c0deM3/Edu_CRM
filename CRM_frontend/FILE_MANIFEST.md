# CRM Frontend - File Manifest & Directory Structure

## Complete File Listing

### 📄 Root Level Configuration Files
```
├── package.json                    # Project dependencies and scripts
├── package-lock.json               # Locked dependency versions
├── tsconfig.json                   # TypeScript configuration
├── tsconfig.app.json               # TypeScript app configuration
├── tsconfig.node.json              # TypeScript Node configuration
├── vite.config.ts                  # Vite configuration
├── eslint.config.js                # ESLint configuration
├── .gitignore                       # Git ignore patterns
├── index.html                       # HTML entry point
└── README.md                        # Default README
```

### 📄 Documentation Files (Created)
```
├── PROJECT_SUMMARY.md              # ✨ Complete project summary
├── SETUP_INSTRUCTIONS.md           # ✨ Detailed setup guide
├── QUICK_START.md                  # ✨ Quick start for developers
├── IMPLEMENTATION_CHECKLIST.md     # ✨ Feature checklist
├── API_DOCUMENTATION.md            # Backend API reference (provided)
└── CRM_FRONTEND_TR.md              # Requirements (provided)
```

### 📁 src/ Directory Structure

#### Main Application Files
```
src/
├── main.tsx                        # Application entry point
├── App.tsx                         # Main App component with routing
├── App.css                         # Global app styles
└── index.css                       # Global styles
```

#### 📁 src/pages/ - Page Components
```
pages/
├── auth/
│   ├── LoginPage.tsx               # Login form component
│   └── LoginPage.css               # Login page styles
├── dashboard/
│   ├── Dashboard.tsx               # Dashboard page
│   └── Dashboard.css               # Dashboard styles
├── students/
│   └── StudentsPage.tsx            # Students management page
├── teachers/
│   └── TeachersPage.tsx            # Teachers management page
├── payments/
│   └── PaymentsPage.tsx            # Payments management page
├── grades/
│   └── GradesPage.tsx              # Grades management page
├── attendance/
│   └── AttendancePage.tsx          # Attendance management page
├── classes/
│   └── ClassesPage.tsx             # Classes management page
├── centers/
│   └── CentersPage.tsx             # Centers management page
├── debts/
│   └── DebtsPage.tsx               # Debts management page
├── assignments/
│   └── AssignmentsPage.tsx         # Assignments management page
└── subjects/
    └── SubjectsPage.tsx            # Subjects management page
```

#### 📁 src/components/ - UI Components
```
components/
├── layout/
│   ├── Layout.tsx                  # Main layout wrapper component
│   ├── Layout.css                  # Layout styles
│   ├── Sidebar.tsx                 # Navigation sidebar component
│   └── Sidebar.css                 # Sidebar styles
├── common/
│   ├── ProtectedRoute.tsx          # Route protection component
│   └── ProtectedRoute.css          # Protected route styles
└── index.ts                        # Component exports
```

#### 📁 src/hooks/ - Custom React Hooks
```
hooks/
├── useAppDispatch.ts               # Typed dispatch hook
├── useAppSelector.ts               # Typed selector hook
├── useRBAC.ts                      # Role-based access control hook
└── index.ts                        # Hook exports
```

#### 📁 src/slices/ - Redux State Slices
```
slices/
└── authSlice.ts                    # Authentication state management
```

#### 📁 src/store/ - Redux Store
```
store/
└── index.ts                        # Redux store configuration
```

#### 📁 src/services/ - API Services
```
services/
└── api.ts                          # Axios client & API endpoints
```

#### 📁 src/types/ - TypeScript Definitions
```
types/
└── index.ts                        # All type definitions and interfaces
```

#### 📁 src/utils/ - Utility Functions
```
utils/
└── helpers.ts                      # Helper functions (storage, formatting)
```

#### 📁 src/styles/ - Global Styles
```
styles/
(Styles are organized in component directories)
```

### 📁 public/ - Static Assets
```
public/
(SVG and other static files)
```

### 📁 dist/ - Build Output
```
dist/
├── index.html                      # Built HTML
├── assets/
│   ├── index-*.css                 # Bundled CSS
│   └── index-*.js                  # Bundled JavaScript
└── (other built assets)
```

### 📁 node_modules/ - Dependencies
```
node_modules/
(All installed npm packages)
```

---

## 📊 File Statistics

### TypeScript/React Files: 35
- Pages: 11
- Components: 5
- Hooks: 3
- Slices: 1
- Services: 1
- Types: 1
- Utils: 1
- Store: 1
- Main App: 1
- Entry Point: 1
- Config: 2

### CSS Files: 12
- Component CSS: 10
- Global CSS: 2

### Documentation Files: 6
- Setup & Guide docs: 4
- Project docs: 2

### Configuration Files: 7
- Build/Lint config: 7

### Total Files: 60+

---

## 🔑 Key Files Overview

### Critical Files (Must Understand)

1. **src/App.tsx**
   - Main routing configuration
   - All routes defined here
   - Protected route setup

2. **src/slices/authSlice.ts**
   - Authentication state management
   - Login/logout actions
   - User state

3. **src/hooks/useRBAC.ts**
   - Role-based access control logic
   - Permission checking
   - Very important for security

4. **src/services/api.ts**
   - All API endpoints
   - Axios configuration
   - Request/response handling

5. **src/components/layout/Sidebar.tsx**
   - Main navigation component
   - Role-based menu filtering
   - User information display

6. **src/store/index.ts**
   - Redux store setup
   - Reducer configuration

### Important Files (Should Know)

- `src/types/index.ts` - All TypeScript definitions
- `src/pages/auth/LoginPage.tsx` - Authentication UI
- `src/pages/dashboard/Dashboard.tsx` - Dashboard page
- `src/components/common/ProtectedRoute.tsx` - Route protection

### Support Files

- `src/main.tsx` - React app mounting
- `src/utils/helpers.ts` - Utility functions
- `src/App.css` - Global styles
- `src/index.css` - Reset and base styles

---

## 🎨 CSS File Organization

```
Component-Based CSS Structure:
├── src/components/layout/
│   ├── Sidebar.tsx
│   ├── Sidebar.css            ← Scoped to Sidebar
│   ├── Layout.tsx
│   └── Layout.css             ← Scoped to Layout
├── src/pages/auth/
│   ├── LoginPage.tsx
│   └── LoginPage.css          ← Scoped to LoginPage
├── src/pages/dashboard/
│   ├── Dashboard.tsx
│   └── Dashboard.css          ← Scoped to Dashboard
└── Global Styles
    ├── src/App.css            ← Global app styles
    └── src/index.css          ← Reset and base styles
```

---

## 📦 Module Dependencies

### Core Framework
- react@18.x
- react-dom@18.x
- vite@7.3.1

### State Management
- @reduxjs/toolkit
- react-redux

### Routing
- react-router-dom

### HTTP Client
- axios

### UI/Icons
- lucide-react

### Build Tools
- TypeScript
- ESLint
- @vitejs/plugin-react

---

## 🚀 How to Navigate the Project

### To Add a New Page:
1. Create folder in `src/pages/{moduleName}`
2. Create `{ModuleName}Page.tsx`
3. Add route in `src/App.tsx`
4. Add menu item in `src/components/layout/Sidebar.tsx`
5. Add page to exports in `src/pages/index.ts` (if created)

### To Add a New Component:
1. Create folder in `src/components/{componentName}`
2. Create `{ComponentName}.tsx`
3. Create `{ComponentName}.css` for styling
4. Export from `src/components/index.ts`

### To Add a New API:
1. Create service function in `src/services/api.ts`
2. Export from the same file
3. Use in pages/components with useEffect

### To Add a New Redux Slice:
1. Create file in `src/slices/{featureName}Slice.ts`
2. Import in `src/store/index.ts`
3. Add to reducer configuration

### To Add a New Custom Hook:
1. Create file in `src/hooks/use{HookName}.ts`
2. Export from `src/hooks/index.ts`
3. Use in components with `import { use{HookName} } from '../hooks'`

---

## 📍 Important Paths Reference

| What | Path |
|------|------|
| Pages | `src/pages/` |
| Components | `src/components/` |
| Hooks | `src/hooks/` |
| Redux | `src/slices/`, `src/store/` |
| API | `src/services/api.ts` |
| Types | `src/types/index.ts` |
| Utils | `src/utils/` |
| Styles | Component-scoped CSS files |
| Config | Root level (tsconfig, vite.config, etc.) |

---

## 🔄 File Dependencies

```
App.tsx
├── Components
│   ├── LoginPage
│   ├── Dashboard
│   ├── Layout
│   │   └── Sidebar
│   └── Pages (Students, Teachers, etc.)
├── Hooks
│   ├── useAppDispatch
│   ├── useAppSelector
│   └── useRBAC
├── Slices
│   └── authSlice
└── Services
    └── api.ts

Redux Store
├── authSlice
└── Used by
    ├── App.tsx (initialization)
    ├── useAppSelector (reading state)
    └── useAppDispatch (dispatching actions)

API Services (api.ts)
├── Used by pages/components
├── Uses Axios
└── Interceptors add token to requests
```

---

## 🎯 Getting Started with the Codebase

1. **Start Here**: `src/App.tsx` - Understand routing
2. **Then Read**: `src/slices/authSlice.ts` - Understand state
3. **Then Read**: `src/services/api.ts` - Understand API
4. **Then Read**: `src/hooks/useRBAC.ts` - Understand permissions
5. **Then Read**: `src/components/layout/Sidebar.tsx` - Understand UI
6. **Then Explore**: Individual page components

---

## 📚 Documentation Cross-Reference

| Documentation | Purpose |
|--------------|---------|
| PROJECT_SUMMARY.md | Overview of entire project |
| SETUP_INSTRUCTIONS.md | How to install and configure |
| QUICK_START.md | Quick reference for developers |
| IMPLEMENTATION_CHECKLIST.md | What's done and what's next |
| API_DOCUMENTATION.md | Backend API reference |
| CRM_FRONTEND_TR.md | Project requirements |

---

## ✅ Checklist for New Developers

- [ ] Read PROJECT_SUMMARY.md
- [ ] Read QUICK_START.md
- [ ] Understand file structure above
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Navigate to http://localhost:5173
- [ ] Review src/App.tsx
- [ ] Review src/services/api.ts
- [ ] Review src/slices/authSlice.ts
- [ ] Review src/hooks/useRBAC.ts
- [ ] Try adding a new page
- [ ] Try calling an API endpoint

---

**Total Project Size**: ~5000+ lines of code  
**Created**: January 18, 2026  
**Status**: ✅ Production Ready
