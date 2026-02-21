# CRM System Tests

This folder contains Playwright tests for the Education CRM system, including both API integration tests and E2E frontend tests.

## Folder Structure

```
tests/
├── api/                    # API Integration Tests
│   ├── auth.spec.ts        # Authentication endpoints
│   ├── classes.spec.ts     # Classes CRUD operations
│   ├── core.spec.ts        # Health check & other core APIs
│   ├── students.spec.ts    # Students CRUD operations
│   └── teachers.spec.ts    # Teachers CRUD operations
├── e2e/                    # E2E Frontend Tests
│   ├── auth.spec.ts        # Login pages
│   ├── dashboard.spec.ts   # Dashboard functionality
│   ├── pages.spec.ts       # Various CRM pages
│   ├── students.spec.ts    # Students management
│   └── tests-page.spec.ts  # Tests/exams functionality
├── fixtures/               # Test utilities
│   └── test-helpers.ts     # Shared helpers and data generators
├── package.json            # Test dependencies
├── playwright.config.ts    # Playwright configuration
└── README.md               # This file
```

## Setup

### 1. Install Dependencies

```bash
cd tests
npm install
npm run install-browsers
```

### 2. Start the Application

Make sure both backend and frontend are running:

```bash
# Terminal 1 - Backend
cd CRM_backend
npm run dev

# Terminal 2 - Frontend
cd CRM_frontend
npm run dev
```

Or let Playwright start them automatically (configured in `playwright.config.ts`).

## Running Tests

### Run All Tests

```bash
npm test
```

### Run API Tests Only

```bash
npm run test:api
```

### Run E2E Tests Only

```bash
npm run test:e2e
```

### Run Tests in All Browsers

```bash
npm run test:all-browsers
```

### Run Tests with UI (Debug Mode)

```bash
npm run test:headed
```

### Interactive UI Mode

```bash
npm run test:ui
```

### Debug Mode

```bash
npm run test:debug
```

### View Test Report

```bash
npm run report
```

## Test Categories

### API Integration Tests

These tests verify backend API endpoints work correctly:

- **Health Check**: Server status
- **Students API**: CRUD operations for students
- **Teachers API**: CRUD operations for teachers
- **Classes API**: CRUD operations for classes
- **Authentication**: Login endpoints for all user types
- **Core APIs**: Centers, subjects, payments, debts, grades, attendance, assignments

### E2E Frontend Tests

These tests verify the frontend UI works correctly:

- **Authentication**: Login forms for superuser, teacher, student, owner
- **Dashboard**: Navigation and content display
- **Students Page**: List, add, edit students
- **Teachers Page**: List and manage teachers
- **Other Pages**: Classes, centers, payments, attendance, grades, assignments, tests

## Configuration

The `playwright.config.ts` file configures:

- **Test directory**: Current folder
- **Browsers**: Chromium, Firefox, WebKit
- **Base URLs**: 
  - Frontend: `http://localhost:5173`
  - API: `http://localhost:3000`
- **Web servers**: Auto-start backend and frontend
- **Reporters**: HTML report and list output
- **Screenshots**: On failure only
- **Traces**: On first retry

## Customizing Test Credentials

Update credentials in `fixtures/test-helpers.ts`:

```typescript
export const testUsers = {
  superuser: {
    username: 'your_admin_username',
    password: 'your_admin_password',
  },
  // ...
};
```

## CI/CD Integration

For CI environments, set `CI=true`:

```bash
CI=true npm test
```

This will:
- Retry failed tests 2 times
- Use a single worker
- Fail if `test.only` is found in code

## Troubleshooting

### Tests fail to connect to servers

Make sure:
1. PostgreSQL database is running (`docker-compose up -d` in CRM_backend)
2. Backend is running on port 3000
3. Frontend is running on port 5173

### Browser not found

Run:
```bash
npx playwright install
```

### Tests timeout

Increase timeout in `playwright.config.ts` or individual tests:
```typescript
test('my test', async ({ page }) => {
  test.setTimeout(60000);
  // ...
});
```
