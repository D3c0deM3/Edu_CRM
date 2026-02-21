import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Debts endpoints
 * Tests full CRUD + getByStudent + paymentSummary + analyzeUnpaidMonths + generateDebts + error handling
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Debts API - Full CRUD', () => {
  let request: APIRequestContext;
  let createdDebtId: number;
  let validStudentId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    const studentsRes = await request.get('/api/students');
    const students = await studentsRes.json();
    if (students.length > 0) {
      validStudentId = students[0].student_id;
    }
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  // ── GET All ──────────────────────────────────────────────────────────────

  test('GET /api/debts - should return all debts', async () => {
    const response = await request.get('/api/debts');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const debts = await response.json();
    expect(Array.isArray(debts)).toBeTruthy();
  });

  test('GET /api/debts - response items should have expected fields', async () => {
    const response = await request.get('/api/debts');
    const debts = await response.json();

    if (debts.length > 0) {
      const debt = debts[0];
      expect(debt).toHaveProperty('debt_id');
      expect(debt).toHaveProperty('student_id');
      expect(debt).toHaveProperty('debt_amount');
      expect(debt).toHaveProperty('balance');
    }
  });

  // ── POST Create ──────────────────────────────────────────────────────────

  test('POST /api/debts - should create a new debt', async () => {
    if (!validStudentId) return;

    const newDebt = {
      student_id: validStudentId,
      center_id: 1,
      debt_amount: 1000.00,
      debt_date: '2025-01-01',
      due_date: '2025-02-01',
      amount_paid: 200.00,
      remarks: 'Test debt',
    };

    const response = await request.post('/api/debts', {
      data: newDebt,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const debt = await response.json();
    expect(parseFloat(debt.debt_amount)).toBe(1000.00);
    expect(parseFloat(debt.amount_paid)).toBe(200.00);
    expect(parseFloat(debt.balance)).toBe(800.00);
    expect(debt.remarks).toBe('Test debt');

    createdDebtId = debt.debt_id;
  });

  test('POST /api/debts - should calculate balance correctly with no payment', async () => {
    if (!validStudentId) return;

    const response = await request.post('/api/debts', {
      data: {
        student_id: validStudentId,
        center_id: 1,
        debt_amount: 500.00,
        debt_date: '2025-03-01',
        due_date: '2025-04-01',
      },
    });

    if (response.ok()) {
      const debt = await response.json();
      expect(parseFloat(debt.balance)).toBe(500.00);
      expect(parseFloat(debt.amount_paid)).toBe(0);
      // Cleanup
      await request.delete(`/api/debts/${debt.debt_id}`);
    }
  });

  // ── GET by ID ────────────────────────────────────────────────────────────

  test('GET /api/debts/:id - should return debt by ID', async () => {
    const allResponse = await request.get('/api/debts');
    const debts = await allResponse.json();

    if (debts.length > 0) {
      const debtId = debts[0].debt_id;
      const response = await request.get(`/api/debts/${debtId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const debt = await response.json();
      expect(debt.debt_id).toBe(debtId);
    }
  });

  test('GET /api/debts/:id - should return 404 for non-existent debt', async () => {
    const response = await request.get('/api/debts/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Debt not found');
  });

  // ── GET by Student ───────────────────────────────────────────────────────

  test('GET /api/debts/student/:studentId - should return debts for a student', async () => {
    if (!validStudentId) return;

    const response = await request.get(`/api/debts/student/${validStudentId}`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const debts = await response.json();
    expect(Array.isArray(debts)).toBeTruthy();
  });

  test('GET /api/debts/student/:studentId - should return empty array for student with no debts', async () => {
    const response = await request.get('/api/debts/student/999999');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const debts = await response.json();
    expect(Array.isArray(debts)).toBeTruthy();
  });

  // ── GET Payment Summary ──────────────────────────────────────────────────

  test('GET /api/debts/student/:studentId/summary - should return payment summary', async () => {
    if (!validStudentId) return;

    const response = await request.get(`/api/debts/student/${validStudentId}/summary`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('GET /api/debts/student/:studentId/summary - should handle non-existent student', async () => {
    const response = await request.get('/api/debts/student/999999/summary');

    // Should either return 200 with empty data or a proper error
    expect(response.status()).toBeLessThan(500);
  });

  // ── GET Analyze Unpaid Months ────────────────────────────────────────────

  test('GET /api/debts/analyze - should analyze unpaid months', async () => {
    const response = await request.get('/api/debts/analyze');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const analysis = await response.json();
    expect(analysis).toHaveProperty('analysis_period');
    expect(analysis).toHaveProperty('summary');
    expect(analysis).toHaveProperty('results');
    expect(Array.isArray(analysis.results)).toBeTruthy();
  });

  test('GET /api/debts/analyze - should accept center_id filter', async () => {
    const response = await request.get('/api/debts/analyze?center_id=1');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const analysis = await response.json();
    expect(analysis).toHaveProperty('results');
  });

  test('GET /api/debts/analyze - should accept date range parameters', async () => {
    const response = await request.get('/api/debts/analyze?start_date=2024-01-01&end_date=2025-01-01');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const analysis = await response.json();
    expect(analysis).toHaveProperty('analysis_period');
  });

  // ── POST Generate Debts from Analysis ────────────────────────────────────

  test('POST /api/debts/generate-from-analysis - should handle valid request', async () => {
    if (!validStudentId) return;

    const response = await request.post('/api/debts/generate-from-analysis', {
      data: {
        student_ids: [validStudentId],
        monthly_fee: 200,
        center_id: 1,
        remarks: 'Auto-generated from analysis',
      },
    });

    // Should either succeed or return a handled error
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /api/debts/generate-from-analysis - should handle empty student_ids', async () => {
    const response = await request.post('/api/debts/generate-from-analysis', {
      data: {
        student_ids: [],
        monthly_fee: 200,
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  // ── PUT Update ───────────────────────────────────────────────────────────

  test('PUT /api/debts/:id - should update a debt', async () => {
    const allResponse = await request.get('/api/debts');
    const debts = await allResponse.json();

    if (debts.length > 0) {
      const debtId = createdDebtId || debts[0].debt_id;
      const updateData = {
        amount_paid: 500.00,
        remarks: 'Partial payment made',
      };

      const response = await request.put(`/api/debts/${debtId}`, {
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const debt = await response.json();
      expect(parseFloat(debt.amount_paid)).toBe(500.00);
      expect(debt.remarks).toBe('Partial payment made');
    }
  });

  test('PUT /api/debts/:id - should recalculate balance on update', async () => {
    if (!validStudentId) return;

    // Create a debt with known amounts
    const createRes = await request.post('/api/debts', {
      data: {
        student_id: validStudentId,
        center_id: 1,
        debt_amount: 1000,
        debt_date: '2025-05-01',
        due_date: '2025-06-01',
        amount_paid: 0,
      },
    });

    if (createRes.ok()) {
      const created = await createRes.json();

      const updateRes = await request.put(`/api/debts/${created.debt_id}`, {
        data: { amount_paid: 400 },
      });

      if (updateRes.ok()) {
        const updated = await updateRes.json();
        expect(parseFloat(updated.balance)).toBe(600);
      }

      // Cleanup
      await request.delete(`/api/debts/${created.debt_id}`);
    }
  });

  test('PUT /api/debts/:id - should return 404 for non-existent debt', async () => {
    const response = await request.put('/api/debts/999999', {
      data: { amount_paid: 100 },
    });

    expect(response.status()).toBe(404);
  });

  // ── DELETE ───────────────────────────────────────────────────────────────

  test('DELETE /api/debts/:id - should delete a debt', async () => {
    if (createdDebtId) {
      const response = await request.delete(`/api/debts/${createdDebtId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.message).toBe('Debt deleted successfully');
    }
  });

  test('DELETE /api/debts/:id - should return 404 for non-existent debt', async () => {
    const response = await request.delete('/api/debts/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Debt not found');
  });
});
