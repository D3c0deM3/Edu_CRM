import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Subjects endpoints
 * Tests full CRUD operations + getByClass + error handling for /api/subjects
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Subjects API - Full CRUD', () => {
  let request: APIRequestContext;
  let createdSubjectId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  // ── GET All ──────────────────────────────────────────────────────────────

  test('GET /api/subjects - should return all subjects', async () => {
    const response = await request.get('/api/subjects');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const subjects = await response.json();
    expect(Array.isArray(subjects)).toBeTruthy();
  });

  test('GET /api/subjects - response items should have expected fields', async () => {
    const response = await request.get('/api/subjects');
    const subjects = await response.json();

    if (subjects.length > 0) {
      const subject = subjects[0];
      expect(subject).toHaveProperty('subject_id');
      expect(subject).toHaveProperty('subject_name');
    }
  });

  // ── POST Create ──────────────────────────────────────────────────────────

  test('POST /api/subjects - should create a new subject', async () => {
    // First get a valid class to associate with
    const classesResponse = await request.get('/api/classes');
    const classes = await classesResponse.json();
    const classId = classes.length > 0 ? classes[0].class_id : 1;

    const timestamp = Date.now();
    const newSubject = {
      class_id: classId,
      subject_name: `Test Subject ${timestamp}`,
      subject_code: `TS${timestamp}`,
      teacher_id: 1,
      total_marks: 100,
      passing_marks: 40,
    };

    const response = await request.post('/api/subjects', {
      data: newSubject,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const subject = await response.json();
    expect(subject.subject_name).toBe(newSubject.subject_name);
    expect(subject.subject_code).toBe(newSubject.subject_code);
    expect(subject).toHaveProperty('subject_id');

    createdSubjectId = subject.subject_id;
  });

  test('POST /api/subjects - should use defaults for marks if not provided', async () => {
    const classesResponse = await request.get('/api/classes');
    const classes = await classesResponse.json();
    const classId = classes.length > 0 ? classes[0].class_id : 1;

    const timestamp = Date.now();
    const response = await request.post('/api/subjects', {
      data: {
        class_id: classId,
        subject_name: `Default Marks Subject ${timestamp}`,
        subject_code: `DMS${timestamp}`,
      },
    });

    if (response.ok()) {
      const subject = await response.json();
      expect(subject.total_marks).toBe(100);
      expect(subject.passing_marks).toBe(40);
      // Cleanup
      await request.delete(`/api/subjects/${subject.subject_id}`);
    }
  });

  // ── GET by ID ────────────────────────────────────────────────────────────

  test('GET /api/subjects/:id - should return subject by ID', async () => {
    const allResponse = await request.get('/api/subjects');
    const subjects = await allResponse.json();

    if (subjects.length > 0) {
      const subjectId = subjects[0].subject_id;
      const response = await request.get(`/api/subjects/${subjectId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const subject = await response.json();
      expect(subject.subject_id).toBe(subjectId);
    }
  });

  test('GET /api/subjects/:id - should return 404 for non-existent subject', async () => {
    const response = await request.get('/api/subjects/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Subject not found');
  });

  // ── GET by Class ─────────────────────────────────────────────────────────

  test('GET /api/subjects/class/:classId - should return subjects for a class', async () => {
    const classesResponse = await request.get('/api/classes');
    const classes = await classesResponse.json();

    if (classes.length > 0) {
      const classId = classes[0].class_id;
      const response = await request.get(`/api/subjects/class/${classId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const subjects = await response.json();
      expect(Array.isArray(subjects)).toBeTruthy();
    }
  });

  test('GET /api/subjects/class/:classId - should return empty array for class with no subjects', async () => {
    const response = await request.get('/api/subjects/class/999999');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const subjects = await response.json();
    expect(Array.isArray(subjects)).toBeTruthy();
    expect(subjects.length).toBe(0);
  });

  // ── PUT Update ───────────────────────────────────────────────────────────

  test('PUT /api/subjects/:id - should update a subject', async () => {
    const allResponse = await request.get('/api/subjects');
    const subjects = await allResponse.json();

    if (subjects.length > 0) {
      const subjectId = createdSubjectId || subjects[0].subject_id;
      const updateData = {
        subject_name: 'Updated Subject Name',
        total_marks: 150,
      };

      const response = await request.put(`/api/subjects/${subjectId}`, {
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const subject = await response.json();
      expect(subject.subject_name).toBe(updateData.subject_name);
    }
  });

  test('PUT /api/subjects/:id - should return 404 for non-existent subject', async () => {
    const response = await request.put('/api/subjects/999999', {
      data: { subject_name: 'Ghost Subject' },
    });

    expect(response.status()).toBe(404);
  });

  test('PUT /api/subjects/:id - should do partial update', async () => {
    const allResponse = await request.get('/api/subjects');
    const subjects = await allResponse.json();

    if (subjects.length > 0) {
      const subjectId = createdSubjectId || subjects[0].subject_id;
      const beforeResponse = await request.get(`/api/subjects/${subjectId}`);
      const before = await beforeResponse.json();

      const response = await request.put(`/api/subjects/${subjectId}`, {
        data: { passing_marks: 50 },
      });

      if (response.ok()) {
        const after = await response.json();
        expect(after.passing_marks).toBe(50);
        expect(after.subject_name).toBe(before.subject_name);
      }
    }
  });

  // ── DELETE ───────────────────────────────────────────────────────────────

  test('DELETE /api/subjects/:id - should delete a subject', async () => {
    if (createdSubjectId) {
      const response = await request.delete(`/api/subjects/${createdSubjectId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.message).toBe('Subject deleted successfully');
    }
  });

  test('DELETE /api/subjects/:id - should return 404 for non-existent subject', async () => {
    const response = await request.delete('/api/subjects/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Subject not found');
  });

  test('DELETE /api/subjects/:id - deleted subject should not be retrievable', async () => {
    const classesResponse = await request.get('/api/classes');
    const classes = await classesResponse.json();
    const classId = classes.length > 0 ? classes[0].class_id : 1;

    const timestamp = Date.now();
    const createRes = await request.post('/api/subjects', {
      data: {
        class_id: classId,
        subject_name: `Temp Subject ${timestamp}`,
        subject_code: `TMP${timestamp}`,
      },
    });

    if (createRes.ok()) {
      const created = await createRes.json();
      await request.delete(`/api/subjects/${created.subject_id}`);
      const getRes = await request.get(`/api/subjects/${created.subject_id}`);
      expect(getRes.status()).toBe(404);
    }
  });
});
