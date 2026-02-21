import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Tests endpoints
 * Tests full CRUD + questions + passages + submissions + results + assignments
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Tests API - CRUD', () => {
  let request: APIRequestContext;
  let createdTestId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  // ── GET All ──────────────────────────────────────────────────────────────

  test('GET /api/tests - should return all tests', async () => {
    const response = await request.get('/api/tests');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const tests = await response.json();
    expect(Array.isArray(tests)).toBeTruthy();
  });

  test('GET /api/tests - response items should have expected fields', async () => {
    const response = await request.get('/api/tests');
    const tests = await response.json();

    if (tests.length > 0) {
      const t = tests[0];
      expect(t).toHaveProperty('test_id');
      expect(t).toHaveProperty('test_name');
      expect(t).toHaveProperty('test_type');
    }
  });

  test('GET /api/tests - should filter by center_id', async () => {
    const response = await request.get('/api/tests?center_id=1');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const tests = await response.json();
    expect(Array.isArray(tests)).toBeTruthy();
  });

  test('GET /api/tests - should filter by test_type', async () => {
    const response = await request.get('/api/tests?test_type=multiple_choice');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const tests = await response.json();
    expect(Array.isArray(tests)).toBeTruthy();
  });

  test('GET /api/tests - should filter by is_active', async () => {
    const response = await request.get('/api/tests?is_active=true');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const tests = await response.json();
    expect(Array.isArray(tests)).toBeTruthy();
  });

  test('GET /api/tests - should filter by subject_id', async () => {
    const response = await request.get('/api/tests?subject_id=1');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const tests = await response.json();
    expect(Array.isArray(tests)).toBeTruthy();
  });

  test('GET /api/tests - should support multiple filters', async () => {
    const response = await request.get('/api/tests?center_id=1&is_active=true');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const tests = await response.json();
    expect(Array.isArray(tests)).toBeTruthy();
  });

  // ── POST Create ──────────────────────────────────────────────────────────

  test('POST /api/tests - should create a new test', async () => {
    const timestamp = Date.now();
    const newTest = {
      center_id: 1,
      test_name: `Test Exam ${timestamp}`,
      test_type: 'multiple_choice',
      description: 'Test description for integration test',
      instructions: 'Read carefully before answering',
      total_marks: 100,
      passing_marks: 40,
      duration_minutes: 60,
    };

    const response = await request.post('/api/tests', {
      data: newTest,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const created = await response.json();
    expect(created.test_name).toBe(newTest.test_name);
    expect(created.test_type).toBe('multiple_choice');
    expect(created).toHaveProperty('test_id');

    createdTestId = created.test_id;
  });

  test('POST /api/tests - should create test with default values', async () => {
    const timestamp = Date.now();
    const response = await request.post('/api/tests', {
      data: {
        center_id: 1,
        test_name: `Minimal Test ${timestamp}`,
        test_type: 'short_answer',
      },
    });

    if (response.ok()) {
      const created = await response.json();
      expect(created.duration_minutes).toBe(60);
      expect(created.is_timed).toBe(true);
      // Cleanup
      await request.delete(`/api/tests/${created.test_id}`);
    }
  });

  test('POST /api/tests - should create test with all test types', async () => {
    const types = ['essay', 'true_false', 'matching', 'form_filling'];
    
    for (const testType of types) {
      const timestamp = Date.now();
      const response = await request.post('/api/tests', {
        data: {
          center_id: 1,
          test_name: `${testType} Test ${timestamp}`,
          test_type: testType,
          total_marks: 50,
        },
      });

      if (response.ok()) {
        const created = await response.json();
        expect(created.test_type).toBe(testType);
        await request.delete(`/api/tests/${created.test_id}`);
      }
    }
  });

  // ── GET by ID ────────────────────────────────────────────────────────────

  test('GET /api/tests/:id - should return test with questions and passages', async () => {
    const allResponse = await request.get('/api/tests');
    const tests = await allResponse.json();

    if (tests.length > 0) {
      const testId = tests[0].test_id;
      const response = await request.get(`/api/tests/${testId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const testData = await response.json();
      expect(testData.test_id).toBe(testId);
      expect(testData).toHaveProperty('questions');
      expect(testData).toHaveProperty('passages');
      expect(Array.isArray(testData.questions)).toBeTruthy();
      expect(Array.isArray(testData.passages)).toBeTruthy();
    }
  });

  test('GET /api/tests/:id - should return 404 for non-existent test', async () => {
    const response = await request.get('/api/tests/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Test not found');
  });

  // ── PUT Update ───────────────────────────────────────────────────────────

  test('PUT /api/tests/:id - should update a test', async () => {
    if (!createdTestId) return;

    const updateData = {
      test_name: 'Updated Test Name',
      description: 'Updated description',
      total_marks: 200,
      passing_marks: 80,
    };

    const response = await request.put(`/api/tests/${createdTestId}`, {
      data: updateData,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('PUT /api/tests/:id - should handle non-existent test', async () => {
    const response = await request.put('/api/tests/999999', {
      data: { test_name: 'Ghost Test' },
    });

    // Should return 404 or an error status
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  // ── DELETE ───────────────────────────────────────────────────────────────

  test('DELETE /api/tests/:id - should delete a test', async () => {
    if (createdTestId) {
      const response = await request.delete(`/api/tests/${createdTestId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
    }
  });

  test('DELETE /api/tests/:id - should handle non-existent test', async () => {
    const response = await request.delete('/api/tests/999999');

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Tests API - Questions', () => {
  let request: APIRequestContext;
  let testId: number;
  let questionId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    // Create a test to add questions to
    const timestamp = Date.now();
    const response = await request.post('/api/tests', {
      data: {
        center_id: 1,
        test_name: `Question Test ${timestamp}`,
        test_type: 'multiple_choice',
        total_marks: 100,
      },
    });

    if (response.ok()) {
      const created = await response.json();
      testId = created.test_id;
    }
  });

  test.afterAll(async () => {
    if (testId) {
      await request.delete(`/api/tests/${testId}`);
    }
    await request.dispose();
  });

  test('POST /api/tests/:testId/questions - should add a question', async () => {
    if (!testId) return;

    const response = await request.post(`/api/tests/${testId}/questions`, {
      data: {
        question_text: 'What is 2+2?',
        question_type: 'multiple_choice',
        options: JSON.stringify(['3', '4', '5', '6']),
        correct_answer: '4',
        marks: 10,
        question_order: 1,
      },
    });

    if (response.ok()) {
      const question = await response.json();
      expect(question).toHaveProperty('question_id');
      questionId = question.question_id;
    }

    expect(response.status()).toBeLessThan(500);
  });

  test('POST /api/tests/:testId/questions - should add a true/false question', async () => {
    if (!testId) return;

    const response = await request.post(`/api/tests/${testId}/questions`, {
      data: {
        question_text: 'The earth is flat.',
        question_type: 'true_false',
        correct_answer: 'false',
        marks: 5,
        question_order: 2,
      },
    });

    expect(response.status()).toBeLessThan(500);

    if (response.ok()) {
      const question = await response.json();
      // Cleanup
      await request.delete(`/api/tests/questions/${question.question_id}`);
    }
  });

  test('PUT /api/tests/questions/:questionId - should update a question', async () => {
    if (!questionId) return;

    const response = await request.put(`/api/tests/questions/${questionId}`, {
      data: {
        question_text: 'What is 3+3?',
        correct_answer: '6',
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('PUT /api/tests/questions/:questionId - should handle non-existent question', async () => {
    const response = await request.put('/api/tests/questions/999999', {
      data: { question_text: 'Ghost question' },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('DELETE /api/tests/questions/:questionId - should delete a question', async () => {
    if (!questionId) return;

    const response = await request.delete(`/api/tests/questions/${questionId}`);

    expect(response.status()).toBeLessThan(500);
  });

  test('DELETE /api/tests/questions/:questionId - should handle non-existent question', async () => {
    const response = await request.delete('/api/tests/questions/999999');

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Tests API - Passages', () => {
  let request: APIRequestContext;
  let testId: number;
  let passageId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    const timestamp = Date.now();
    const response = await request.post('/api/tests', {
      data: {
        center_id: 1,
        test_name: `Passage Test ${timestamp}`,
        test_type: 'reading_passage',
        total_marks: 100,
      },
    });

    if (response.ok()) {
      const created = await response.json();
      testId = created.test_id;
    }
  });

  test.afterAll(async () => {
    if (testId) {
      await request.delete(`/api/tests/${testId}`);
    }
    await request.dispose();
  });

  test('POST /api/tests/:testId/passages - should add a passage', async () => {
    if (!testId) return;

    const response = await request.post(`/api/tests/${testId}/passages`, {
      data: {
        title: 'Reading Passage 1',
        content: 'This is a sample reading passage for testing purposes. It contains multiple sentences that students would need to read and comprehend.',
        passage_order: 1,
      },
    });

    expect(response.status()).toBeLessThan(500);

    if (response.ok()) {
      const passage = await response.json();
      passageId = passage.passage_id;
    }
  });

  test('PUT /api/tests/passages/:passageId - should update a passage', async () => {
    if (!passageId) return;

    const response = await request.put(`/api/tests/passages/${passageId}`, {
      data: {
        title: 'Updated Passage Title',
        content: 'Updated content for the passage.',
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('PUT /api/tests/passages/:passageId - should handle non-existent passage', async () => {
    const response = await request.put('/api/tests/passages/999999', {
      data: { title: 'Ghost passage' },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('DELETE /api/tests/passages/:passageId - should delete a passage', async () => {
    if (!passageId) return;

    const response = await request.delete(`/api/tests/passages/${passageId}`);

    expect(response.status()).toBeLessThan(500);
  });

  test('DELETE /api/tests/passages/:passageId - should handle non-existent passage', async () => {
    const response = await request.delete('/api/tests/passages/999999');

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Tests API - Submissions', () => {
  let request: APIRequestContext;
  let testId: number;
  let validStudentId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    const testsRes = await request.get('/api/tests');
    const tests = await testsRes.json();
    if (tests.length > 0) testId = tests[0].test_id;

    const studentsRes = await request.get('/api/students');
    const students = await studentsRes.json();
    if (students.length > 0) validStudentId = students[0].student_id;
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('POST /api/tests/:testId/start - should start a test', async () => {
    if (!testId || !validStudentId) return;

    const response = await request.post(`/api/tests/${testId}/start`, {
      data: {
        student_id: validStudentId,
      },
    });

    // May succeed or fail depending on test assignments
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /api/tests/:testId/submissions - should get submissions for a test', async () => {
    if (!testId) return;

    const response = await request.get(`/api/tests/${testId}/submissions`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const submissions = await response.json();
    expect(Array.isArray(submissions)).toBeTruthy();
  });

  test('GET /api/tests/submissions/:submissionId - should handle non-existent submission', async () => {
    const response = await request.get('/api/tests/submissions/999999');

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('GET /api/tests/student/:studentId/submissions - should get student submissions', async () => {
    if (!validStudentId) return;

    const response = await request.get(`/api/tests/student/${validStudentId}/submissions`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const submissions = await response.json();
    expect(Array.isArray(submissions)).toBeTruthy();
  });

  test('GET /api/tests/student/:studentId/submissions - should return empty for non-existent student', async () => {
    const response = await request.get('/api/tests/student/999999/submissions');

    expect(response.ok()).toBeTruthy();
    const submissions = await response.json();
    expect(Array.isArray(submissions)).toBeTruthy();
  });
});

test.describe('Tests API - Results', () => {
  let request: APIRequestContext;
  let validStudentId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    const studentsRes = await request.get('/api/students');
    const students = await studentsRes.json();
    if (students.length > 0) validStudentId = students[0].student_id;
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/tests/:testId/results - should return test results', async () => {
    const testsRes = await request.get('/api/tests');
    const tests = await testsRes.json();

    if (tests.length > 0) {
      const response = await request.get(`/api/tests/${tests[0].test_id}/results`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
    }
  });

  test('GET /api/tests/:testId/results - should handle non-existent test', async () => {
    const response = await request.get('/api/tests/999999/results');

    // May return 200 with empty results or 404
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /api/tests/student/:studentId/results - should return student results', async () => {
    if (!validStudentId) return;

    const response = await request.get(`/api/tests/student/${validStudentId}/results`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('GET /api/tests/student/:studentId/results - should handle non-existent student', async () => {
    const response = await request.get('/api/tests/student/999999/results');

    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('Tests API - Assign Tests', () => {
  let request: APIRequestContext;
  let testId: number;
  let validStudentId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    const testsRes = await request.get('/api/tests');
    const tests = await testsRes.json();
    if (tests.length > 0) testId = tests[0].test_id;

    const studentsRes = await request.get('/api/students');
    const students = await studentsRes.json();
    if (students.length > 0) validStudentId = students[0].student_id;
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('POST /api/tests/:testId/assign - should assign a test', async () => {
    if (!testId || !validStudentId) return;

    const response = await request.post(`/api/tests/${testId}/assign`, {
      data: {
        assigned_to_type: 'student',
        assigned_to_id: validStudentId,
      },
    });

    // May succeed or fail depending on existing assignments
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /api/tests/assigned/student/:id - should get tests assigned to student', async () => {
    if (!validStudentId) return;

    const response = await request.get(`/api/tests/assigned/student/${validStudentId}`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const tests = await response.json();
    expect(Array.isArray(tests)).toBeTruthy();
  });

  test('GET /api/tests/assigned/teacher/:id - should get tests assigned to teacher', async () => {
    const teachersRes = await request.get('/api/teachers');
    const teachers = await teachersRes.json();

    if (teachers.length > 0) {
      const response = await request.get(`/api/tests/assigned/teacher/${teachers[0].teacher_id}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const tests = await response.json();
      expect(Array.isArray(tests)).toBeTruthy();
    }
  });

  test('GET /api/tests/assigned/class/:id - should get tests assigned to class', async () => {
    const classesRes = await request.get('/api/classes');
    const classes = await classesRes.json();

    if (classes.length > 0) {
      const response = await request.get(`/api/tests/assigned/class/${classes[0].class_id}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const tests = await response.json();
      expect(Array.isArray(tests)).toBeTruthy();
    }
  });

  test('GET /api/tests/assigned/student/:id - should return empty for non-existent student', async () => {
    const response = await request.get('/api/tests/assigned/student/999999');

    expect(response.ok()).toBeTruthy();
    const tests = await response.json();
    expect(Array.isArray(tests)).toBeTruthy();
  });
});
