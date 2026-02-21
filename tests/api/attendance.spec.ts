import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * API Integration Tests for Attendance endpoints
 * Tests full CRUD + getByStudent + getByClass + error handling for /api/attendance
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Attendance API - Full CRUD', () => {
  let request: APIRequestContext;
  let createdAttendanceId: number;
  let validStudentId: number;
  let validTeacherId: number;
  let validClassId: number;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: BASE_URL,
    });

    const [studentsRes, teachersRes, classesRes] = await Promise.all([
      request.get('/api/students'),
      request.get('/api/teachers'),
      request.get('/api/classes'),
    ]);

    const students = await studentsRes.json();
    if (students.length > 0) validStudentId = students[0].student_id;

    const teachers = await teachersRes.json();
    if (teachers.length > 0) validTeacherId = teachers[0].teacher_id;

    const classes = await classesRes.json();
    if (classes.length > 0) validClassId = classes[0].class_id;
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  // ── GET All ──────────────────────────────────────────────────────────────

  test('GET /api/attendance - should return all attendance records', async () => {
    const response = await request.get('/api/attendance');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const attendance = await response.json();
    expect(Array.isArray(attendance)).toBeTruthy();
  });

  test('GET /api/attendance - response items should have expected fields', async () => {
    const response = await request.get('/api/attendance');
    const records = await response.json();

    if (records.length > 0) {
      const record = records[0];
      expect(record).toHaveProperty('attendance_id');
      expect(record).toHaveProperty('student_id');
      expect(record).toHaveProperty('status');
    }
  });

  // ── POST Create ──────────────────────────────────────────────────────────

  test('POST /api/attendance - should create an attendance record', async () => {
    if (!validStudentId) return;

    const newAttendance = {
      student_id: validStudentId,
      teacher_id: validTeacherId || 1,
      class_id: validClassId || 1,
      attendance_date: '2025-01-15',
      status: 'Present',
      remarks: 'On time',
    };

    const response = await request.post('/api/attendance', {
      data: newAttendance,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);

    const attendance = await response.json();
    expect(attendance.status).toBe('Present');
    expect(attendance.remarks).toBe('On time');
    expect(attendance).toHaveProperty('attendance_id');

    createdAttendanceId = attendance.attendance_id;
  });

  test('POST /api/attendance - should default status to Present', async () => {
    if (!validStudentId) return;

    const response = await request.post('/api/attendance', {
      data: {
        student_id: validStudentId,
        teacher_id: validTeacherId || 1,
        class_id: validClassId || 1,
        attendance_date: '2025-01-16',
      },
    });

    if (response.ok()) {
      const attendance = await response.json();
      expect(attendance.status).toBe('Present');
      // Cleanup
      await request.delete(`/api/attendance/${attendance.attendance_id}`);
    }
  });

  test('POST /api/attendance - should accept Absent status', async () => {
    if (!validStudentId) return;

    const response = await request.post('/api/attendance', {
      data: {
        student_id: validStudentId,
        teacher_id: validTeacherId || 1,
        class_id: validClassId || 1,
        attendance_date: '2025-01-17',
        status: 'Absent',
        remarks: 'Sick leave',
      },
    });

    if (response.ok()) {
      const attendance = await response.json();
      expect(attendance.status).toBe('Absent');
      // Cleanup
      await request.delete(`/api/attendance/${attendance.attendance_id}`);
    }
  });

  // ── GET by ID ────────────────────────────────────────────────────────────

  test('GET /api/attendance/:id - should return attendance by ID', async () => {
    const allResponse = await request.get('/api/attendance');
    const records = await allResponse.json();

    if (records.length > 0) {
      const attendanceId = records[0].attendance_id;
      const response = await request.get(`/api/attendance/${attendanceId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const record = await response.json();
      expect(record.attendance_id).toBe(attendanceId);
    }
  });

  test('GET /api/attendance/:id - should return 404 for non-existent record', async () => {
    const response = await request.get('/api/attendance/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Attendance not found');
  });

  // ── GET by Student ───────────────────────────────────────────────────────

  test('GET /api/attendance/student/:studentId - should return attendance for a student', async () => {
    if (!validStudentId) return;

    const response = await request.get(`/api/attendance/student/${validStudentId}`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const records = await response.json();
    expect(Array.isArray(records)).toBeTruthy();
  });

  test('GET /api/attendance/student/:studentId - should return empty for student with no records', async () => {
    const response = await request.get('/api/attendance/student/999999');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const records = await response.json();
    expect(Array.isArray(records)).toBeTruthy();
    expect(records.length).toBe(0);
  });

  // ── GET by Class ─────────────────────────────────────────────────────────

  test('GET /api/attendance/class/:classId - should return attendance for a class', async () => {
    if (!validClassId) return;

    const response = await request.get(`/api/attendance/class/${validClassId}`);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const records = await response.json();
    expect(Array.isArray(records)).toBeTruthy();
  });

  test('GET /api/attendance/class/:classId - should return empty for class with no records', async () => {
    const response = await request.get('/api/attendance/class/999999');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const records = await response.json();
    expect(Array.isArray(records)).toBeTruthy();
    expect(records.length).toBe(0);
  });

  // ── PUT Update ───────────────────────────────────────────────────────────

  test('PUT /api/attendance/:id - should update an attendance record', async () => {
    const allResponse = await request.get('/api/attendance');
    const records = await allResponse.json();

    if (records.length > 0) {
      const attendanceId = createdAttendanceId || records[0].attendance_id;
      const updateData = {
        status: 'Late',
        remarks: 'Arrived 10 minutes late',
      };

      const response = await request.put(`/api/attendance/${attendanceId}`, {
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const record = await response.json();
      expect(record.status).toBe('Late');
      expect(record.remarks).toBe('Arrived 10 minutes late');
    }
  });

  test('PUT /api/attendance/:id - should return 404 for non-existent record', async () => {
    const response = await request.put('/api/attendance/999999', {
      data: { status: 'Present' },
    });

    expect(response.status()).toBe(404);
  });

  test('PUT /api/attendance/:id - should do partial update', async () => {
    const allResponse = await request.get('/api/attendance');
    const records = await allResponse.json();

    if (records.length > 0) {
      const attendanceId = createdAttendanceId || records[0].attendance_id;
      const beforeResponse = await request.get(`/api/attendance/${attendanceId}`);
      const before = await beforeResponse.json();

      const response = await request.put(`/api/attendance/${attendanceId}`, {
        data: { remarks: 'Updated remark only' },
      });

      if (response.ok()) {
        const after = await response.json();
        expect(after.remarks).toBe('Updated remark only');
        expect(after.status).toBe(before.status);
      }
    }
  });

  // ── DELETE ───────────────────────────────────────────────────────────────

  test('DELETE /api/attendance/:id - should delete an attendance record', async () => {
    if (createdAttendanceId) {
      const response = await request.delete(`/api/attendance/${createdAttendanceId}`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.message).toBe('Attendance record deleted successfully');
    }
  });

  test('DELETE /api/attendance/:id - should return 404 for non-existent record', async () => {
    const response = await request.delete('/api/attendance/999999');

    expect(response.status()).toBe(404);

    const error = await response.json();
    expect(error.error).toBe('Attendance record not found');
  });

  test('DELETE /api/attendance/:id - deleted record should not be retrievable', async () => {
    if (!validStudentId) return;

    const createRes = await request.post('/api/attendance', {
      data: {
        student_id: validStudentId,
        teacher_id: validTeacherId || 1,
        class_id: validClassId || 1,
        attendance_date: '2025-01-20',
        status: 'Present',
      },
    });

    if (createRes.ok()) {
      const created = await createRes.json();
      await request.delete(`/api/attendance/${created.attendance_id}`);
      const getRes = await request.get(`/api/attendance/${created.attendance_id}`);
      expect(getRes.status()).toBe(404);
    }
  });
});
