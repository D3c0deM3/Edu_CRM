import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Students endpoints
 * Tests CRUD operations for the /api/students endpoint
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Students API', () => {
  let request: APIRequestContext;
  let createdStudentId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/students - should return all students', async () => {
    const response = await request.get('/api/students');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const students = await response.json();
    expect(Array.isArray(students)).toBeTruthy();
  });

  test('POST /api/students - should create a new student', async () => {
    const newStudent = {
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
    };

    const response = await request.post('/api/students', {
      data: newStudent,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);
    
    const student = await response.json();
    expect(student.first_name).toBe(newStudent.first_name);
    expect(student.last_name).toBe(newStudent.last_name);
    expect(student.email).toBe(newStudent.email);
    
    // Save for later tests
    createdStudentId = student.student_id;
  });

  test('GET /api/students/:id - should return student by ID', async () => {
    // First, get all students to get a valid ID
    const allStudentsResponse = await request.get('/api/students');
    const students = await allStudentsResponse.json();
    
    if (students.length > 0) {
      const studentId = students[0].student_id;
      const response = await request.get(`/api/students/${studentId}`);
      
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const student = await response.json();
      expect(student.student_id).toBe(studentId);
    }
  });

  test('GET /api/students/:id - should return 404 for non-existent student', async () => {
    const response = await request.get('/api/students/999999');
    
    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error.error).toBe('Student not found');
  });

  test('PUT /api/students/:id - should update a student', async () => {
    // Get a student to update
    const allStudentsResponse = await request.get('/api/students');
    const students = await allStudentsResponse.json();
    
    if (students.length > 0) {
      const studentId = createdStudentId || students[0].student_id;
      const updateData = {
        first_name: 'Updated',
        last_name: 'Name',
      };

      const response = await request.put(`/api/students/${studentId}`, {
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const student = await response.json();
      expect(student.first_name).toBe(updateData.first_name);
      expect(student.last_name).toBe(updateData.last_name);
    }
  });

  test('DELETE /api/students/:id - should delete a student', async () => {
    if (createdStudentId) {
      const response = await request.delete(`/api/students/${createdStudentId}`);
      
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const result = await response.json();
      expect(result.message).toBe('Student deleted successfully');
    }
  });
});
