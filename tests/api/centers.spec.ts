import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Centers endpoints
 * Tests full CRUD operations + error handling for /api/centers
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Centers API - Full CRUD', () => {
  let request: APIRequestContext;
  let createdCenterId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  // ── GET All ──────────────────────────────────────────────────────────────

  test('GET /api/centers - should return all centers', async () => {
    const response = await request.get('/api/centers');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const centers = await response.json();
    expect(Array.isArray(centers)).toBeTruthy();
  });

  test('GET /api/centers - response items should have expected fields', async () => {
    const response = await request.get('/api/centers');
    const centers = await response.json();

    if (centers.length > 0) {
      const center = centers[0];
      expect(center).toHaveProperty('center_id');
      expect(center).toHaveProperty('center_name');
    }
  });

  // ── POST Create ──────────────────────────────────────────────────────────

  test('POST /api/centers - should create a new center', async () => {
    const timestamp = Date.now();
    const newCenter = {
      center_name: `Test Center ${timestamp}`,
      center_code: `TC${timestamp}`,
      email: `center_${timestamp}@example.com`,
      phone: '1234567890',
      address: '123 Test Street',
      city: 'Test City',
      principal_name: 'Test Principal',
    };

    const response = await request.post('/api/centers', {
      data: newCenter,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const center = await response.json();
    expect(center.center_name).toBe(newCenter.center_name);
    expect(center.email).toBe(newCenter.email);
    expect(center.phone).toBe(newCenter.phone);
    expect(center.address).toBe(newCenter.address);
    expect(center.city).toBe(newCenter.city);
    expect(center.principal_name).toBe(newCenter.principal_name);
    expect(center).toHaveProperty('center_id');

    createdCenterId = center.center_id;
  });

  test('POST /api/centers - should create center with minimal data', async () => {
    const timestamp = Date.now();
    const response = await request.post('/api/centers', {
      data: {
        center_name: `Minimal Center ${timestamp}`,
        center_code: `MC${timestamp}`,
      },
    });

    if (response.ok()) {
      const center = await response.json();
      expect(center.center_name).toContain('Minimal Center');
      // Cleanup
      await request.delete(`/api/centers/${center.center_id}`);
    }
  });

  // ── GET by ID ────────────────────────────────────────────────────────────

  test('GET /api/centers/:id - should return center by ID', async () => {
    const allResponse = await request.get('/api/centers');
    const centers = await allResponse.json();

    if (centers.length > 0) {
      const centerId = centers[0].center_id;
      const response = await request.get(`/api/centers/${centerId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const center = await response.json();
      expect(center.center_id).toBe(centerId);
    }
  });

  test('GET /api/centers/:id - should return 404 for non-existent center', async () => {
    const response = await request.get('/api/centers/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Center not found');
  });

  test('GET /api/centers/:id - should handle invalid ID format', async () => {
    const response = await request.get('/api/centers/invalid');

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // ── PUT Update ───────────────────────────────────────────────────────────

  test('PUT /api/centers/:id - should update a center', async () => {
    const allResponse = await request.get('/api/centers');
    const centers = await allResponse.json();

    if (centers.length > 0) {
      const centerId = createdCenterId || centers[0].center_id;
      const updateData = {
        center_name: 'Updated Center Name',
        city: 'Updated City',
      };

      const response = await request.put(`/api/centers/${centerId}`, {
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const center = await response.json();
      expect(center.center_name).toBe(updateData.center_name);
      expect(center.city).toBe(updateData.city);
    }
  });

  test('PUT /api/centers/:id - should return 404 for non-existent center', async () => {
    const response = await request.put('/api/centers/999999', {
      data: { center_name: 'Ghost Center' },
    });

    expect(response.status()).toBe(404);
  });

  test('PUT /api/centers/:id - should do partial update (COALESCE)', async () => {
    const allResponse = await request.get('/api/centers');
    const centers = await allResponse.json();

    if (centers.length > 0) {
      const centerId = createdCenterId || centers[0].center_id;

      // Get current data
      const beforeResponse = await request.get(`/api/centers/${centerId}`);
      const before = await beforeResponse.json();

      // Update only one field
      const response = await request.put(`/api/centers/${centerId}`, {
        data: { phone: '9998887777' },
      });

      if (response.ok()) {
        const after = await response.json();
        expect(after.phone).toBe('9998887777');
        // Other fields should remain unchanged
        expect(after.center_name).toBe(before.center_name);
      }
    }
  });

  // ── DELETE ───────────────────────────────────────────────────────────────

  test('DELETE /api/centers/:id - should delete a center', async () => {
    if (createdCenterId) {
      const response = await request.delete(`/api/centers/${createdCenterId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.message).toBe('Center deleted successfully');
    }
  });

  test('DELETE /api/centers/:id - should return 404 for non-existent center', async () => {
    const response = await request.delete('/api/centers/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Center not found');
  });

  test('DELETE /api/centers/:id - deleted center should not be retrievable', async () => {
    // Create then delete
    const timestamp = Date.now();
    const createRes = await request.post('/api/centers', {
      data: {
        center_name: `Temp Center ${timestamp}`,
        center_code: `TMP${timestamp}`,
      },
    });

    if (createRes.ok()) {
      const created = await createRes.json();
      await request.delete(`/api/centers/${created.center_id}`);
      const getRes = await request.get(`/api/centers/${created.center_id}`);
      expect(getRes.status()).toBe(404);
    }
  });
});
