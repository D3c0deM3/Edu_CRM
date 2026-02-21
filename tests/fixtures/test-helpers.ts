import { Page } from '@playwright/test';

/**
 * Test Fixtures and Helpers for CRM E2E Tests
 */

export interface UserCredentials {
  username: string;
  password: string;
}

export const testUsers = {
  superuser: {
    username: 'm_kadirov',
    password: '123456789',
  },
  teacher: {
    username: 'm_kadirov',
    password: 'Ifromurgut2005$',
  },
  student: {
    username: 'mr1_kadirov',
    password: '123456789',
  },
};

/**
 * Login as a specific user type
 */
export async function loginAs(
  page: Page,
  userType: 'superuser' | 'teacher' | 'student',
  credentials?: UserCredentials
) {
  const creds = credentials || testUsers[userType];
  
  await page.goto(`/login/${userType}`);
  await page.locator('input[type="text"], input[name="username"]').first().fill(creds.username);
  await page.locator('input[type="password"]').first().fill(creds.password);
  await page.getByRole('button', { name: /login|sign in/i }).click();
  
  // Wait for navigation or error
  await page.waitForLoadState('networkidle');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('/login');
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
  // Try to find logout button
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  
  if (await logoutButton.count() > 0) {
    await logoutButton.click();
    await page.waitForLoadState('networkidle');
  } else {
    // Navigate to login page directly
    await page.goto('/login/superuser');
    // Clear storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

/**
 * Get API base URL based on environment
 */
export function getApiBaseUrl(): string {
  return process.env.API_BASE_URL || 'http://localhost:3000';
}

/**
 * Get frontend base URL based on environment
 */
export function getFrontendBaseUrl(): string {
  return process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
}

/**
 * Test data generators
 */
export const testData = {
  generateStudent: () => ({
    center_id: 1,
    enrollment_number: `TEST-${Date.now()}`,
    first_name: 'Test',
    last_name: 'Student',
    username: `testuser_${Date.now()}`,
    password: 'testpassword123',
    email: `test_${Date.now()}@example.com`,
    phone: '1234567890',
    date_of_birth: '2000-01-01',
    parent_name: 'Test Parent',
    parent_phone: '0987654321',
    gender: 'Male',
    status: 'Active',
  }),

  generateTeacher: () => ({
    center_id: 1,
    first_name: 'Test',
    last_name: 'Teacher',
    username: `teacher_${Date.now()}`,
    password: 'testpassword123',
    email: `teacher_${Date.now()}@example.com`,
    phone: '1234567890',
    specialization: 'Mathematics',
    status: 'Active',
  }),

  generateClass: () => ({
    center_id: 1,
    class_name: `Test Class ${Date.now()}`,
    subject_id: 1,
    teacher_id: 1,
    schedule: JSON.stringify({ days: ['Monday', 'Wednesday'], time: '10:00' }),
    max_capacity: 30,
    current_enrollment: 0,
    status: 'Active',
  }),

  generateCenter: () => ({
    name: `Test Center ${Date.now()}`,
    address: '123 Test Street',
    phone: '1234567890',
    email: `center_${Date.now()}@example.com`,
    status: 'Active',
  }),

  generateSubject: () => ({
    subject_name: `Test Subject ${Date.now()}`,
    class_id: 1,
    description: 'A test subject for automated testing',
    total_marks: 100,
  }),

  generatePayment: () => ({
    student_id: 1,
    amount: 100.00,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    currency: 'USD',
    description: 'Test payment',
    status: 'Completed',
  }),

  generateDebt: () => ({
    student_id: 1,
    amount: 50.00,
    due_date: new Date().toISOString().split('T')[0],
    description: 'Test debt',
    status: 'Pending',
  }),

  generateGrade: () => ({
    student_id: 1,
    subject_id: 1,
    grade: 85,
    total_marks: 100,
    grade_date: new Date().toISOString().split('T')[0],
    comments: 'Test grade entry',
  }),

  generateAttendance: () => ({
    student_id: 1,
    class_id: 1,
    date: new Date().toISOString().split('T')[0],
    status: 'Present',
  }),

  generateAssignment: () => ({
    class_id: 1,
    title: `Test Assignment ${Date.now()}`,
    description: 'A test assignment for automated testing',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Pending',
  }),

  generateTest: () => ({
    title: `Test Exam ${Date.now()}`,
    description: 'A test exam for automated testing',
    test_type: 'quiz',
    center_id: 1,
    subject_id: 1,
    duration_minutes: 60,
    total_marks: 100,
    passing_marks: 50,
    is_active: true,
  }),

  generateSuperuser: () => ({
    username: `admin_${Date.now()}`,
    password: 'testpassword123',
    first_name: 'Test',
    last_name: 'Admin',
    email: `admin_${Date.now()}@example.com`,
    role: 'admin',
  }),

  generateQuestion: (testId: number) => ({
    test_id: testId,
    question_text: `Test question ${Date.now()}?`,
    question_type: 'multiple_choice',
    options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
    correct_answer: 'Option A',
    marks: 5,
  }),

  generatePassage: (testId: number) => ({
    test_id: testId,
    title: `Test Passage ${Date.now()}`,
    content: 'This is a test passage content for automated testing.',
    order_number: 1,
  }),
};
