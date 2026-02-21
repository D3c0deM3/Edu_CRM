import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Extended Authentication API Tests
 * Tests student/teacher login, set-password, change-password endpoints
 */

const BASE_URL = 'http://localhost:3000';

// ============================================================================
// Student Authentication Extended Tests
// ============================================================================

test.describe('Student Authentication - Extended', () => {
  let request: APIRequestContext;
  let validStudentId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    const studentsRes = await request.get('/api/students');
    const students = await studentsRes.json();
    if (students.length > 0) validStudentId = students[0].student_id;
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  // ── Login Validation ─────────────────────────────────────────────────────

  test('POST /api/students/auth/login - should fail with invalid credentials', async () => {
    const response = await request.post('/api/students/auth/login', {
      data: {
        username: 'nonexistent_student_xyz',
        password: 'wrong_password',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/students/auth/login - should fail with empty username', async () => {
    const response = await request.post('/api/students/auth/login', {
      data: {
        username: '',
        password: 'some_password',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/students/auth/login - should fail with empty password', async () => {
    const response = await request.post('/api/students/auth/login', {
      data: {
        username: 'some_user',
        password: '',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/students/auth/login - should fail with empty credentials', async () => {
    const response = await request.post('/api/students/auth/login', {
      data: {
        username: '',
        password: '',
      },
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toBe('Username and password required');
  });

  test('POST /api/students/auth/login - should fail with missing fields', async () => {
    const response = await request.post('/api/students/auth/login', {
      data: {},
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // ── Set Password ─────────────────────────────────────────────────────────

  test('POST /api/students/:id/set-password - should handle set-password request', async () => {
    if (!validStudentId) return;

    const timestamp = Date.now();
    const response = await request.post(`/api/students/${validStudentId}/set-password`, {
      data: {
        username: `student_test_${timestamp}`,
        password: 'NewTestPassword123!',
      },
    });

    // Should either succeed or return a handled error
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /api/students/:id/set-password - should handle non-existent student', async () => {
    const response = await request.post('/api/students/999999/set-password', {
      data: {
        username: 'ghost_user',
        password: 'ghost_pass',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // ── Change Password ──────────────────────────────────────────────────────

  test('POST /api/students/:id/change-password - should fail with wrong old password', async () => {
    if (!validStudentId) return;

    const response = await request.post(`/api/students/${validStudentId}/change-password`, {
      data: {
        old_password: 'definitely_wrong_old_password',
        new_password: 'new_password_123',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/students/:id/change-password - should handle non-existent student', async () => {
    const response = await request.post('/api/students/999999/change-password', {
      data: {
        old_password: 'old_pass',
        new_password: 'new_pass',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/students/:id/change-password - should fail with missing fields', async () => {
    if (!validStudentId) return;

    const response = await request.post(`/api/students/${validStudentId}/change-password`, {
      data: {
        old_password: 'only_old',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

// ============================================================================
// Teacher Authentication Extended Tests
// ============================================================================

test.describe('Teacher Authentication - Extended', () => {
  let request: APIRequestContext;
  let validTeacherId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    const teachersRes = await request.get('/api/teachers');
    const teachers = await teachersRes.json();
    if (teachers.length > 0) validTeacherId = teachers[0].teacher_id;
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  // ── Login Validation ─────────────────────────────────────────────────────

  test('POST /api/teachers/auth/login - should fail with invalid credentials', async () => {
    const response = await request.post('/api/teachers/auth/login', {
      data: {
        username: 'nonexistent_teacher_xyz',
        password: 'wrong_password',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/teachers/auth/login - should fail with empty username', async () => {
    const response = await request.post('/api/teachers/auth/login', {
      data: {
        username: '',
        password: 'some_password',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/teachers/auth/login - should fail with empty password', async () => {
    const response = await request.post('/api/teachers/auth/login', {
      data: {
        username: 'some_user',
        password: '',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/teachers/auth/login - should fail with empty body', async () => {
    const response = await request.post('/api/teachers/auth/login', {
      data: {},
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/teachers/auth/login - should fail with missing fields', async () => {
    const response = await request.post('/api/teachers/auth/login', {
      data: {
        username: 'only_username',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // ── Set Password ─────────────────────────────────────────────────────────

  test('POST /api/teachers/:id/set-password - should handle set-password request', async () => {
    if (!validTeacherId) return;

    const timestamp = Date.now();
    const response = await request.post(`/api/teachers/${validTeacherId}/set-password`, {
      data: {
        username: `teacher_test_${timestamp}`,
        password: 'NewTeacherPass123!',
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('POST /api/teachers/:id/set-password - should handle non-existent teacher', async () => {
    const response = await request.post('/api/teachers/999999/set-password', {
      data: {
        username: 'ghost_teacher',
        password: 'ghost_pass',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // ── Change Password ──────────────────────────────────────────────────────

  test('POST /api/teachers/:id/change-password - should fail with wrong old password', async () => {
    if (!validTeacherId) return;

    const response = await request.post(`/api/teachers/${validTeacherId}/change-password`, {
      data: {
        old_password: 'definitely_wrong_old_password',
        new_password: 'new_password_123',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/teachers/:id/change-password - should handle non-existent teacher', async () => {
    const response = await request.post('/api/teachers/999999/change-password', {
      data: {
        old_password: 'old_pass',
        new_password: 'new_pass',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/teachers/:id/change-password - should fail with missing new_password', async () => {
    if (!validTeacherId) return;

    const response = await request.post(`/api/teachers/${validTeacherId}/change-password`, {
      data: {
        old_password: 'some_old_pass',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

// ============================================================================
// Cross-Role Auth Edge Cases
// ============================================================================

test.describe('Authentication - Edge Cases', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('Superuser login with SQL injection attempt should fail', async () => {
    const response = await request.post('/api/superusers/auth/login', {
      data: {
        username: "' OR 1=1 --",
        password: "' OR 1=1 --",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Teacher login with SQL injection attempt should fail', async () => {
    const response = await request.post('/api/teachers/auth/login', {
      data: {
        username: "'; DROP TABLE teachers; --",
        password: 'password',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Student login with SQL injection attempt should fail', async () => {
    const response = await request.post('/api/students/auth/login', {
      data: {
        username: "admin'--",
        password: 'anything',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Superuser login with very long username should not crash', async () => {
    const response = await request.post('/api/superusers/auth/login', {
      data: {
        username: 'a'.repeat(1000),
        password: 'password',
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('Teacher login with special characters should not crash', async () => {
    const response = await request.post('/api/teachers/auth/login', {
      data: {
        username: '🔥💀test<script>alert(1)</script>',
        password: '🔥💀test',
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('Student login with numeric-only credentials should fail gracefully', async () => {
    const response = await request.post('/api/students/auth/login', {
      data: {
        username: '12345',
        password: '67890',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
