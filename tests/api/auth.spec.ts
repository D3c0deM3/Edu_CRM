import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Superuser/Authentication endpoints
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Superusers API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/superusers - should return all superusers', async () => {
    const response = await request.get('/api/superusers');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const superusers = await response.json();
    expect(Array.isArray(superusers)).toBeTruthy();
  });

  test('POST /api/superusers/auth/login - should fail with invalid credentials', async () => {
    const loginData = {
      username: 'invalid_user',
      password: 'invalid_password',
    };

    const response = await request.post('/api/superusers/auth/login', {
      data: loginData,
    });

    // Should return unauthorized or bad request
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/superusers/auth/login - should fail with missing credentials', async () => {
    const loginData = {
      username: 'testuser',
      // Missing password
    };

    const response = await request.post('/api/superusers/auth/login', {
      data: loginData,
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Teacher Authentication API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('POST /api/teachers/auth/login - should fail with invalid credentials', async () => {
    const loginData = {
      username: 'invalid_teacher',
      password: 'invalid_password',
    };

    const response = await request.post('/api/teachers/auth/login', {
      data: loginData,
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Student Authentication API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('POST /api/students/auth/login - should fail with invalid credentials', async () => {
    const loginData = {
      username: 'invalid_student',
      password: 'invalid_password',
    };

    const response = await request.post('/api/students/auth/login', {
      data: loginData,
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/students/auth/login - should fail with empty credentials', async () => {
    const loginData = {
      username: '',
      password: '',
    };

    const response = await request.post('/api/students/auth/login', {
      data: loginData,
    });

    expect(response.status()).toBe(400);
    
    const error = await response.json();
    expect(error.error).toBe('Username and password required');
  });
});
