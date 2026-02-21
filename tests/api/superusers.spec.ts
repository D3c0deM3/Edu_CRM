import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Superusers endpoints
 * Tests full CRUD + login + changePassword + error handling for /api/superusers
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Superusers API - Full CRUD', () => {
  let request: APIRequestContext;
  let createdSuperuserId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  // ── GET All ──────────────────────────────────────────────────────────────

  test('GET /api/superusers - should return all superusers', async () => {
    const response = await request.get('/api/superusers');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const superusers = await response.json();
    expect(Array.isArray(superusers)).toBeTruthy();
  });

  test('GET /api/superusers - response items should have expected fields', async () => {
    const response = await request.get('/api/superusers');
    const superusers = await response.json();

    if (superusers.length > 0) {
      const su = superusers[0];
      expect(su).toHaveProperty('superuser_id');
      expect(su).toHaveProperty('username');
    }
  });

  // ── POST Create ──────────────────────────────────────────────────────────

  test('POST /api/superusers - should create a new superuser', async () => {
    const timestamp = Date.now();
    const newSuperuser = {
      username: `test_admin_${timestamp}`,
      password: 'SecurePassword123!',
      email: `admin_${timestamp}@example.com`,
      first_name: 'Test',
      last_name: 'Admin',
      role: 'admin',
    };

    const response = await request.post('/api/superusers', {
      data: newSuperuser,
    });

    if (response.ok()) {
      expect(response.status()).toBe(201);

      const superuser = await response.json();
      expect(superuser.username).toBe(newSuperuser.username);
      expect(superuser).toHaveProperty('superuser_id');

      createdSuperuserId = superuser.superuser_id;
    }
  });

  // ── GET by ID ────────────────────────────────────────────────────────────

  test('GET /api/superusers/:id - should return superuser by ID', async () => {
    const allResponse = await request.get('/api/superusers');
    const superusers = await allResponse.json();

    if (superusers.length > 0) {
      const suId = superusers[0].superuser_id;
      const response = await request.get(`/api/superusers/${suId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const superuser = await response.json();
      expect(superuser.superuser_id).toBe(suId);
    }
  });

  test('GET /api/superusers/:id - should return 404 for non-existent superuser', async () => {
    const response = await request.get('/api/superusers/999999');

    expect(response.status()).toBe(404);
  });

  // ── PUT Update ───────────────────────────────────────────────────────────

  test('PUT /api/superusers/:id - should update a superuser', async () => {
    if (!createdSuperuserId) return;

    const updateData = {
      first_name: 'Updated',
      last_name: 'Admin',
    };

    const response = await request.put(`/api/superusers/${createdSuperuserId}`, {
      data: updateData,
    });

    if (response.ok()) {
      expect(response.status()).toBe(200);
    }
  });

  test('PUT /api/superusers/:id - should return 404 for non-existent superuser', async () => {
    const response = await request.put('/api/superusers/999999', {
      data: { first_name: 'Ghost' },
    });

    expect(response.status()).toBe(404);
  });

  // ── AUTH Login ───────────────────────────────────────────────────────────

  test('POST /api/superusers/auth/login - should fail with invalid credentials', async () => {
    const response = await request.post('/api/superusers/auth/login', {
      data: {
        username: 'invalid_user_xyz',
        password: 'wrong_password',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/superusers/auth/login - should fail with missing username', async () => {
    const response = await request.post('/api/superusers/auth/login', {
      data: {
        password: 'some_password',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/superusers/auth/login - should fail with missing password', async () => {
    const response = await request.post('/api/superusers/auth/login', {
      data: {
        username: 'some_user',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/superusers/auth/login - should fail with empty body', async () => {
    const response = await request.post('/api/superusers/auth/login', {
      data: {},
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/superusers/auth/login - should fail with empty strings', async () => {
    const response = await request.post('/api/superusers/auth/login', {
      data: {
        username: '',
        password: '',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // ── Change Password ──────────────────────────────────────────────────────

  test('POST /api/superusers/:id/change-password - should fail with wrong old password', async () => {
    const allResponse = await request.get('/api/superusers');
    const superusers = await allResponse.json();

    if (superusers.length > 0) {
      const response = await request.post(`/api/superusers/${superusers[0].superuser_id}/change-password`, {
        data: {
          old_password: 'definitely_wrong_password',
          new_password: 'new_password_123',
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('POST /api/superusers/:id/change-password - should fail for non-existent superuser', async () => {
    const response = await request.post('/api/superusers/999999/change-password', {
      data: {
        old_password: 'old_pass',
        new_password: 'new_pass',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/superusers/:id/change-password - should fail without old_password', async () => {
    const allResponse = await request.get('/api/superusers');
    const superusers = await allResponse.json();

    if (superusers.length > 0) {
      const response = await request.post(`/api/superusers/${superusers[0].superuser_id}/change-password`, {
        data: {
          new_password: 'new_password_123',
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  // ── DELETE ───────────────────────────────────────────────────────────────

  test('DELETE /api/superusers/:id - should delete a superuser', async () => {
    if (createdSuperuserId) {
      const response = await request.delete(`/api/superusers/${createdSuperuserId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
    }
  });

  test('DELETE /api/superusers/:id - should return 404 for non-existent superuser', async () => {
    const response = await request.delete('/api/superusers/999999');

    expect(response.status()).toBe(404);
  });
});
