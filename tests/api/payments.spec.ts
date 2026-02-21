import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Payments endpoints
 * Tests full CRUD operations + getByStudent + error handling for /api/payments
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Payments API - Full CRUD', () => {
  let request: APIRequestContext;
  let createdPaymentId: number;
  let validStudentId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    // Get a valid student ID for payment tests
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

  test('GET /api/payments - should return all payments', async () => {
    const response = await request.get('/api/payments');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const payments = await response.json();
    expect(Array.isArray(payments)).toBeTruthy();
  });

  test('GET /api/payments - response items should have expected fields', async () => {
    const response = await request.get('/api/payments');
    const payments = await response.json();

    if (payments.length > 0) {
      const payment = payments[0];
      expect(payment).toHaveProperty('payment_id');
      expect(payment).toHaveProperty('student_id');
      expect(payment).toHaveProperty('amount');
    }
  });

  // ── POST Create ──────────────────────────────────────────────────────────

  test('POST /api/payments - should create a new payment', async () => {
    if (!validStudentId) return;

    const timestamp = Date.now();
    const newPayment = {
      student_id: validStudentId,
      center_id: 1,
      payment_date: '2025-01-15',
      amount: 500.00,
      currency: 'USD',
      payment_method: 'Cash',
      transaction_reference: `TXN-${timestamp}`,
      receipt_number: `RCP-${timestamp}`,
      payment_status: 'Completed',
      payment_type: 'Monthly',
      notes: 'Test payment',
    };

    const response = await request.post('/api/payments', {
      data: newPayment,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const payment = await response.json();
    expect(parseFloat(payment.amount)).toBe(500.00);
    expect(payment.payment_method).toBe('Cash');
    expect(payment.payment_status).toBe('Completed');
    expect(payment).toHaveProperty('payment_id');

    createdPaymentId = payment.payment_id;
  });

  test('POST /api/payments - should use default values for optional fields', async () => {
    if (!validStudentId) return;

    const response = await request.post('/api/payments', {
      data: {
        student_id: validStudentId,
        center_id: 1,
        payment_date: '2025-02-01',
        amount: 300.00,
      },
    });

    if (response.ok()) {
      const payment = await response.json();
      expect(payment.currency).toBe('USD');
      expect(payment.payment_method).toBe('Cash');
      expect(payment.payment_status).toBe('Completed');
      // Cleanup
      await request.delete(`/api/payments/${payment.payment_id}`);
    }
  });

  // ── GET by ID ────────────────────────────────────────────────────────────

  test('GET /api/payments/:id - should return payment by ID', async () => {
    const allResponse = await request.get('/api/payments');
    const payments = await allResponse.json();

    if (payments.length > 0) {
      const paymentId = payments[0].payment_id;
      const response = await request.get(`/api/payments/${paymentId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const payment = await response.json();
      expect(payment.payment_id).toBe(paymentId);
    }
  });

  test('GET /api/payments/:id - should return 404 for non-existent payment', async () => {
    const response = await request.get('/api/payments/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Payment not found');
  });

  // ── GET by Student ───────────────────────────────────────────────────────

  test('GET /api/payments/student/:studentId - should return payments for a student', async () => {
    if (!validStudentId) return;

    const response = await request.get(`/api/payments/student/${validStudentId}`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const payments = await response.json();
    expect(Array.isArray(payments)).toBeTruthy();
  });

  test('GET /api/payments/student/:studentId - should return empty array for student with no payments', async () => {
    const response = await request.get('/api/payments/student/999999');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const payments = await response.json();
    expect(Array.isArray(payments)).toBeTruthy();
  });

  // ── PUT Update ───────────────────────────────────────────────────────────

  test('PUT /api/payments/:id - should update a payment', async () => {
    const allResponse = await request.get('/api/payments');
    const payments = await allResponse.json();

    if (payments.length > 0) {
      const paymentId = createdPaymentId || payments[0].payment_id;
      const updateData = {
        amount: 750.00,
        payment_status: 'Pending',
        notes: 'Updated note',
      };

      const response = await request.put(`/api/payments/${paymentId}`, {
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const payment = await response.json();
      expect(parseFloat(payment.amount)).toBe(750.00);
      expect(payment.payment_status).toBe('Pending');
      expect(payment.notes).toBe('Updated note');
    }
  });

  test('PUT /api/payments/:id - should return 404 for non-existent payment', async () => {
    const response = await request.put('/api/payments/999999', {
      data: { amount: 100 },
    });

    expect(response.status()).toBe(404);
  });

  // ── DELETE ───────────────────────────────────────────────────────────────

  test('DELETE /api/payments/:id - should delete a payment', async () => {
    if (createdPaymentId) {
      const response = await request.delete(`/api/payments/${createdPaymentId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.message).toBe('Payment deleted successfully');
    }
  });

  test('DELETE /api/payments/:id - should return 404 for non-existent payment', async () => {
    const response = await request.delete('/api/payments/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Payment not found');
  });

  test('DELETE /api/payments/:id - deleted payment should not be retrievable', async () => {
    if (!validStudentId) return;

    const timestamp = Date.now();
    const createRes = await request.post('/api/payments', {
      data: {
        student_id: validStudentId,
        center_id: 1,
        payment_date: '2025-03-01',
        amount: 100.00,
        receipt_number: `DEL-${timestamp}`,
      },
    });

    if (createRes.ok()) {
      const created = await createRes.json();
      await request.delete(`/api/payments/${created.payment_id}`);
      const getRes = await request.get(`/api/payments/${created.payment_id}`);
      expect(getRes.status()).toBe(404);
    }
  });
});
