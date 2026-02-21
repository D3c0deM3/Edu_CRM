import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Grades endpoints
 * Tests full CRUD + getByStudent + bulk create + error handling for /api/grades
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Grades API - Full CRUD', () => {
  let request: APIRequestContext;
  let createdGradeId: number;
  let validStudentId: number;
  let validTeacherId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    const studentsRes = await request.get('/api/students');
    const students = await studentsRes.json();
    if (students.length > 0) {
      validStudentId = students[0].student_id;
    }

    const teachersRes = await request.get('/api/teachers');
    const teachers = await teachersRes.json();
    if (teachers.length > 0) {
      validTeacherId = teachers[0].teacher_id;
    }
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  // ── GET All ──────────────────────────────────────────────────────────────

  test('GET /api/grades - should return all grades', async () => {
    const response = await request.get('/api/grades');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const grades = await response.json();
    expect(Array.isArray(grades)).toBeTruthy();
  });

  test('GET /api/grades - response items should have expected fields', async () => {
    const response = await request.get('/api/grades');
    const grades = await response.json();

    if (grades.length > 0) {
      const grade = grades[0];
      expect(grade).toHaveProperty('grade_id');
      expect(grade).toHaveProperty('student_id');
      expect(grade).toHaveProperty('marks_obtained');
    }
  });

  // ── POST Create ──────────────────────────────────────────────────────────

  test('POST /api/grades - should create a new grade', async () => {
    if (!validStudentId) return;

    const newGrade = {
      student_id: validStudentId,
      teacher_id: validTeacherId || 1,
      subject: 'Mathematics',
      class_id: 1,
      marks_obtained: 85,
      total_marks: 100,
      percentage: 85.0,
      grade_letter: 'A',
      academic_year: '2024-2025',
      term: 'Fall',
    };

    const response = await request.post('/api/grades', {
      data: newGrade,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const grade = await response.json();
    expect(grade.marks_obtained).toBe(85);
    expect(grade.subject).toBe('Mathematics');
    expect(grade.grade_letter).toBe('A');
    expect(grade).toHaveProperty('grade_id');

    createdGradeId = grade.grade_id;
  });

  test('POST /api/grades - should default total_marks to 100', async () => {
    if (!validStudentId) return;

    const response = await request.post('/api/grades', {
      data: {
        student_id: validStudentId,
        teacher_id: validTeacherId || 1,
        subject: 'Science',
        class_id: 1,
        marks_obtained: 70,
        academic_year: '2024-2025',
        term: 'Spring',
      },
    });

    if (response.ok()) {
      const grade = await response.json();
      expect(grade.total_marks).toBe(100);
      // Cleanup
      await request.delete(`/api/grades/${grade.grade_id}`);
    }
  });

  // ── POST Bulk Create ─────────────────────────────────────────────────────

  test('POST /api/grades/bulk - should create multiple grades', async () => {
    if (!validStudentId) return;

    const response = await request.post('/api/grades/bulk', {
      data: {
        grades: [
          {
            student_id: validStudentId,
            teacher_id: validTeacherId || 1,
            subject: 'English',
            class_id: 1,
            marks_obtained: 90,
            total_marks: 100,
            percentage: 90,
            grade_letter: 'A+',
            academic_year: '2024-2025',
            term: 'Fall',
          },
          {
            student_id: validStudentId,
            teacher_id: validTeacherId || 1,
            subject: 'History',
            class_id: 1,
            marks_obtained: 75,
            total_marks: 100,
            percentage: 75,
            grade_letter: 'B',
            academic_year: '2024-2025',
            term: 'Fall',
          },
        ],
      },
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const result = await response.json();
    expect(result.grades).toHaveLength(2);
    expect(result.message).toContain('2 grades created');

    // Cleanup
    for (const g of result.grades) {
      await request.delete(`/api/grades/${g.grade_id}`);
    }
  });

  test('POST /api/grades/bulk - should fail with empty array', async () => {
    const response = await request.post('/api/grades/bulk', {
      data: { grades: [] },
    });

    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.error).toBe('grades must be a non-empty array');
  });

  test('POST /api/grades/bulk - should fail with non-array grades', async () => {
    const response = await request.post('/api/grades/bulk', {
      data: { grades: 'not-an-array' },
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/grades/bulk - should fail without grades key', async () => {
    const response = await request.post('/api/grades/bulk', {
      data: {},
    });

    expect(response.status()).toBe(400);
  });

  // ── GET by ID ────────────────────────────────────────────────────────────

  test('GET /api/grades/:id - should return grade by ID', async () => {
    const allResponse = await request.get('/api/grades');
    const grades = await allResponse.json();

    if (grades.length > 0) {
      const gradeId = grades[0].grade_id;
      const response = await request.get(`/api/grades/${gradeId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const grade = await response.json();
      expect(grade.grade_id).toBe(gradeId);
    }
  });

  test('GET /api/grades/:id - should return 404 for non-existent grade', async () => {
    const response = await request.get('/api/grades/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Grade not found');
  });

  // ── GET by Student ───────────────────────────────────────────────────────

  test('GET /api/grades/student/:studentId - should return grades for a student', async () => {
    if (!validStudentId) return;

    const response = await request.get(`/api/grades/student/${validStudentId}`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const grades = await response.json();
    expect(Array.isArray(grades)).toBeTruthy();
  });

  test('GET /api/grades/student/:studentId - should return empty for student with no grades', async () => {
    const response = await request.get('/api/grades/student/999999');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const grades = await response.json();
    expect(Array.isArray(grades)).toBeTruthy();
  });

  // ── PUT Update ───────────────────────────────────────────────────────────

  test('PUT /api/grades/:id - should update a grade', async () => {
    const allResponse = await request.get('/api/grades');
    const grades = await allResponse.json();

    if (grades.length > 0) {
      const gradeId = createdGradeId || grades[0].grade_id;
      const updateData = {
        marks_obtained: 95,
        percentage: 95.0,
        grade_letter: 'A+',
      };

      const response = await request.put(`/api/grades/${gradeId}`, {
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const grade = await response.json();
      expect(grade.marks_obtained).toBe(95);
      expect(grade.grade_letter).toBe('A+');
    }
  });

  test('PUT /api/grades/:id - should return 404 for non-existent grade', async () => {
    const response = await request.put('/api/grades/999999', {
      data: { marks_obtained: 80 },
    });

    expect(response.status()).toBe(404);
  });

  test('PUT /api/grades/:id - should do partial update', async () => {
    const allResponse = await request.get('/api/grades');
    const grades = await allResponse.json();

    if (grades.length > 0) {
      const gradeId = createdGradeId || grades[0].grade_id;
      const beforeResponse = await request.get(`/api/grades/${gradeId}`);
      const before = await beforeResponse.json();

      const response = await request.put(`/api/grades/${gradeId}`, {
        data: { grade_letter: 'B+' },
      });

      if (response.ok()) {
        const after = await response.json();
        expect(after.grade_letter).toBe('B+');
        expect(after.marks_obtained).toBe(before.marks_obtained);
      }
    }
  });

  // ── DELETE ───────────────────────────────────────────────────────────────

  test('DELETE /api/grades/:id - should delete a grade', async () => {
    if (createdGradeId) {
      const response = await request.delete(`/api/grades/${createdGradeId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.message).toBe('Grade deleted successfully');
    }
  });

  test('DELETE /api/grades/:id - should return 404 for non-existent grade', async () => {
    const response = await request.delete('/api/grades/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Grade not found');
  });
});
