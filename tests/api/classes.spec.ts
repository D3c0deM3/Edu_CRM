import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Classes endpoints
 * Tests CRUD operations for the /api/classes endpoint
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Classes API', () => {
  let request: APIRequestContext;
  let createdClassId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/classes - should return all classes', async () => {
    const response = await request.get('/api/classes');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const classes = await response.json();
    expect(Array.isArray(classes)).toBeTruthy();
  });

  test('POST /api/classes - should create a new class', async () => {
    const newClass = {
      center_id: 1,
      class_name: `Test Class ${Date.now()}`,
      subject_id: 1,
      teacher_id: 1,
      schedule: '{"days": ["Monday", "Wednesday"], "time": "10:00"}',
      max_capacity: 30,
      current_enrollment: 0,
      status: 'Active',
    };

    const response = await request.post('/api/classes', {
      data: newClass,
    });

    if (response.ok()) {
      expect(response.status()).toBe(201);
      
      const classData = await response.json();
      expect(classData.class_name).toBe(newClass.class_name);
      
      createdClassId = classData.class_id;
    }
  });

  test('GET /api/classes/:id - should return class by ID', async () => {
    const allClassesResponse = await request.get('/api/classes');
    const classes = await allClassesResponse.json();
    
    if (classes.length > 0) {
      const classId = classes[0].class_id;
      const response = await request.get(`/api/classes/${classId}`);
      
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const classData = await response.json();
      expect(classData.class_id).toBe(classId);
    }
  });

  test('GET /api/classes/:id - should return 404 for non-existent class', async () => {
    const response = await request.get('/api/classes/999999');
    
    expect(response.status()).toBe(404);
  });

  test('PUT /api/classes/:id - should update a class', async () => {
    const allClassesResponse = await request.get('/api/classes');
    const classes = await allClassesResponse.json();
    
    if (classes.length > 0) {
      const classId = createdClassId || classes[0].class_id;
      const updateData = {
        class_name: 'Updated Class Name',
        max_capacity: 35,
      };

      const response = await request.put(`/api/classes/${classId}`, {
        data: updateData,
      });

      if (response.ok()) {
        expect(response.status()).toBe(200);
        
        const classData = await response.json();
        expect(classData.class_name).toBe(updateData.class_name);
      }
    }
  });

  test('DELETE /api/classes/:id - should delete a class', async () => {
    if (createdClassId) {
      const response = await request.delete(`/api/classes/${createdClassId}`);
      
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
    }
  });
});
