import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Health Check and Core endpoints
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Health Check API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/health - should return OK status', async () => {
    const response = await request.get('/api/health');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    expect(health.status).toBe('OK');
    expect(health.message).toBe('CRM Backend Server is running');
  });
});

test.describe('Centers API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/centers - should return all centers', async () => {
    const response = await request.get('/api/centers');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const centers = await response.json();
    expect(Array.isArray(centers)).toBeTruthy();
  });
});

test.describe('Subjects API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/subjects - should return all subjects', async () => {
    const response = await request.get('/api/subjects');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const subjects = await response.json();
    expect(Array.isArray(subjects)).toBeTruthy();
  });
});

test.describe('Payments API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/payments - should return all payments', async () => {
    const response = await request.get('/api/payments');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const payments = await response.json();
    expect(Array.isArray(payments)).toBeTruthy();
  });
});

test.describe('Debts API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/debts - should return all debts', async () => {
    const response = await request.get('/api/debts');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const debts = await response.json();
    expect(Array.isArray(debts)).toBeTruthy();
  });
});

test.describe('Grades API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/grades - should return all grades', async () => {
    const response = await request.get('/api/grades');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const grades = await response.json();
    expect(Array.isArray(grades)).toBeTruthy();
  });
});

test.describe('Attendance API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/attendance - should return all attendance records', async () => {
    const response = await request.get('/api/attendance');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const attendance = await response.json();
    expect(Array.isArray(attendance)).toBeTruthy();
  });
});

test.describe('Assignments API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/assignments - should return all assignments', async () => {
    const response = await request.get('/api/assignments');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const assignments = await response.json();
    expect(Array.isArray(assignments)).toBeTruthy();
  });
});

test.describe('Tests API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/tests - should return all tests', async () => {
    const response = await request.get('/api/tests');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const tests = await response.json();
    expect(Array.isArray(tests)).toBeTruthy();
  });
});
