import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Teachers endpoints
 * Tests CRUD operations for the /api/teachers endpoint
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Teachers API', () => {
  let request: APIRequestContext;
  let createdTeacherId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/teachers - should return all teachers', async () => {
    const response = await request.get('/api/teachers');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const teachers = await response.json();
    expect(Array.isArray(teachers)).toBeTruthy();
  });

  test('POST /api/teachers - should create a new teacher', async () => {
    const timestamp = Date.now();
    const newTeacher = {
      center_id: 1,
      employee_id: `EMP_${timestamp}`,
      first_name: 'Test',
      last_name: 'Teacher',
      username: `teacher_${timestamp}`,
      password: 'testpassword123',
      email: `teacher_${timestamp}@example.com`,
      phone: '1234567890',
      specialization: 'Mathematics',
      status: 'Active',
    };

    const response = await request.post('/api/teachers', {
      data: newTeacher,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);
    
    const teacher = await response.json();
    expect(teacher.first_name).toBe(newTeacher.first_name);
    expect(teacher.last_name).toBe(newTeacher.last_name);
    expect(teacher.email).toBe(newTeacher.email);
    
    createdTeacherId = teacher.teacher_id;
  });

  test('GET /api/teachers/:id - should return teacher by ID', async () => {
    const allTeachersResponse = await request.get('/api/teachers');
    const teachers = await allTeachersResponse.json();
    
    if (teachers.length > 0) {
      const teacherId = teachers[0].teacher_id;
      const response = await request.get(`/api/teachers/${teacherId}`);
      
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const teacher = await response.json();
      expect(teacher.teacher_id).toBe(teacherId);
    }
  });

  test('GET /api/teachers/:id - should return 404 for non-existent teacher', async () => {
    const response = await request.get('/api/teachers/999999');
    
    expect(response.status()).toBe(404);
  });

  test('PUT /api/teachers/:id - should update a teacher', async () => {
    const allTeachersResponse = await request.get('/api/teachers');
    const teachers = await allTeachersResponse.json();
    
    if (teachers.length > 0) {
      const teacherId = createdTeacherId || teachers[0].teacher_id;
      const updateData = {
        first_name: 'Updated',
        last_name: 'Teacher',
      };

      const response = await request.put(`/api/teachers/${teacherId}`, {
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const teacher = await response.json();
      expect(teacher.first_name).toBe(updateData.first_name);
    }
  });

  test('DELETE /api/teachers/:id - should delete a teacher', async () => {
    if (createdTeacherId) {
      const response = await request.delete(`/api/teachers/${createdTeacherId}`);
      
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
    }
  });
});
