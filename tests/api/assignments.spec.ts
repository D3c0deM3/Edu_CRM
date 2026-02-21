import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Assignments endpoints
 * Tests full CRUD + error handling for /api/assignments
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Assignments API - Full CRUD', () => {
  let request: APIRequestContext;
  let createdAssignmentId: number;
  let validClassId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    const classesRes = await request.get('/api/classes');
    const classes = await classesRes.json();
    if (classes.length > 0) validClassId = classes[0].class_id;
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  // ── GET All ──────────────────────────────────────────────────────────────

  test('GET /api/assignments - should return all assignments', async () => {
    const response = await request.get('/api/assignments');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const assignments = await response.json();
    expect(Array.isArray(assignments)).toBeTruthy();
  });

  test('GET /api/assignments - response items should have expected fields', async () => {
    const response = await request.get('/api/assignments');
    const assignments = await response.json();

    if (assignments.length > 0) {
      const assignment = assignments[0];
      expect(assignment).toHaveProperty('assignment_id');
      expect(assignment).toHaveProperty('assignment_title');
    }
  });

  // ── POST Create ──────────────────────────────────────────────────────────

  test('POST /api/assignments - should create a new assignment', async () => {
    const timestamp = Date.now();
    const newAssignment = {
      class_id: validClassId || 1,
      assignment_title: `Test Assignment ${timestamp}`,
      description: 'Complete chapters 1-3 review questions',
      due_date: '2025-02-15',
      submission_date: '2025-02-14',
      status: 'Active',
    };

    const response = await request.post('/api/assignments', {
      data: newAssignment,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const assignment = await response.json();
    expect(assignment.assignment_title).toBe(newAssignment.assignment_title);
    expect(assignment.description).toBe(newAssignment.description);
    expect(assignment).toHaveProperty('assignment_id');

    createdAssignmentId = assignment.assignment_id;
  });

  test('POST /api/assignments - should default status to Pending', async () => {
    const timestamp = Date.now();
    const response = await request.post('/api/assignments', {
      data: {
        class_id: validClassId || 1,
        assignment_title: `Default Status Assignment ${timestamp}`,
        due_date: '2025-03-01',
      },
    });

    if (response.ok()) {
      const assignment = await response.json();
      expect(assignment.status).toBe('Pending');
      // Cleanup
      await request.delete(`/api/assignments/${assignment.assignment_id}`);
    }
  });

  test('POST /api/assignments - should handle assignment with description', async () => {
    const timestamp = Date.now();
    const longDescription = 'This is a detailed assignment description that covers multiple topics including reading comprehension, critical analysis, and essay writing.';
    
    const response = await request.post('/api/assignments', {
      data: {
        class_id: validClassId || 1,
        assignment_title: `Detailed Assignment ${timestamp}`,
        description: longDescription,
        due_date: '2025-04-01',
      },
    });

    if (response.ok()) {
      const assignment = await response.json();
      expect(assignment.description).toBe(longDescription);
      // Cleanup
      await request.delete(`/api/assignments/${assignment.assignment_id}`);
    }
  });

  // ── GET by ID ────────────────────────────────────────────────────────────

  test('GET /api/assignments/:id - should return assignment by ID', async () => {
    const allResponse = await request.get('/api/assignments');
    const assignments = await allResponse.json();

    if (assignments.length > 0) {
      const assignmentId = assignments[0].assignment_id;
      const response = await request.get(`/api/assignments/${assignmentId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const assignment = await response.json();
      expect(assignment.assignment_id).toBe(assignmentId);
    }
  });

  test('GET /api/assignments/:id - should return 404 for non-existent assignment', async () => {
    const response = await request.get('/api/assignments/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Assignment not found');
  });

  // ── PUT Update ───────────────────────────────────────────────────────────

  test('PUT /api/assignments/:id - should update an assignment', async () => {
    const allResponse = await request.get('/api/assignments');
    const assignments = await allResponse.json();

    if (assignments.length > 0) {
      const assignmentId = createdAssignmentId || assignments[0].assignment_id;
      const updateData = {
        assignment_title: 'Updated Assignment Title',
        status: 'Completed',
        description: 'Updated description',
      };

      const response = await request.put(`/api/assignments/${assignmentId}`, {
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const assignment = await response.json();
      expect(assignment.assignment_title).toBe(updateData.assignment_title);
      expect(assignment.status).toBe('Completed');
    }
  });

  test('PUT /api/assignments/:id - should return 404 for non-existent assignment', async () => {
    const response = await request.put('/api/assignments/999999', {
      data: { assignment_title: 'Ghost Assignment' },
    });

    expect(response.status()).toBe(404);
  });

  test('PUT /api/assignments/:id - should do partial update', async () => {
    const allResponse = await request.get('/api/assignments');
    const assignments = await allResponse.json();

    if (assignments.length > 0) {
      const assignmentId = createdAssignmentId || assignments[0].assignment_id;
      const beforeResponse = await request.get(`/api/assignments/${assignmentId}`);
      const before = await beforeResponse.json();

      const response = await request.put(`/api/assignments/${assignmentId}`, {
        data: { status: 'Graded' },
      });

      if (response.ok()) {
        const after = await response.json();
        expect(after.status).toBe('Graded');
        expect(after.assignment_title).toBe(before.assignment_title);
      }
    }
  });

  test('PUT /api/assignments/:id - should update due_date', async () => {
    const allResponse = await request.get('/api/assignments');
    const assignments = await allResponse.json();

    if (assignments.length > 0) {
      const assignmentId = createdAssignmentId || assignments[0].assignment_id;

      const response = await request.put(`/api/assignments/${assignmentId}`, {
        data: { due_date: '2025-12-31' },
      });

      if (response.ok()) {
        const after = await response.json();
        expect(after.due_date).toBeTruthy();
      }
    }
  });

  // ── DELETE ───────────────────────────────────────────────────────────────

  test('DELETE /api/assignments/:id - should delete an assignment', async () => {
    if (createdAssignmentId) {
      const response = await request.delete(`/api/assignments/${createdAssignmentId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.message).toBe('Assignment deleted successfully');
    }
  });

  test('DELETE /api/assignments/:id - should return 404 for non-existent assignment', async () => {
    const response = await request.delete('/api/assignments/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Assignment not found');
  });

  test('DELETE /api/assignments/:id - deleted assignment should not be retrievable', async () => {
    const timestamp = Date.now();
    const createRes = await request.post('/api/assignments', {
      data: {
        class_id: validClassId || 1,
        assignment_title: `Temp Assignment ${timestamp}`,
        due_date: '2025-05-01',
      },
    });

    if (createRes.ok()) {
      const created = await createRes.json();
      await request.delete(`/api/assignments/${created.assignment_id}`);
      const getRes = await request.get(`/api/assignments/${created.assignment_id}`);
      expect(getRes.status()).toBe(404);
    }
  });
});
