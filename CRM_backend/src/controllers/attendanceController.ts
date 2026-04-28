const db = require('../../config/dbcon');
const cryptoModule = require('crypto');
const { notifyParentsAboutAttendance } = require('../services/parentBotService');

const DEFAULT_ATTENDANCE_STATUS = 'Present';
const ABSENT_ATTENDANCE_STATUS = 'Absent';
const DEFAULT_QR_EXPIRY_MINUTES = 10;
const MIN_QR_EXPIRY_MINUTES = 1;
const MAX_QR_EXPIRY_MINUTES = 120;
const DEFAULT_LOCATION_RADIUS_METERS = 75;
const MIN_LOCATION_RADIUS_METERS = 20;
const MAX_LOCATION_RADIUS_METERS = 500;
const QR_REMARK = 'Checked in via QR';

let qrSchemaInitPromise: Promise<void> | null = null;

const isValidIsoDate = (value: any): boolean =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const toNullableNumber = (value: any): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const appendQrRemark = (remarks: any): string => {
  const normalizedRemarks = typeof remarks === 'string' ? remarks.trim() : '';

  if (!normalizedRemarks) {
    return QR_REMARK;
  }

  if (normalizedRemarks.includes(QR_REMARK)) {
    return normalizedRemarks;
  }

  return `${normalizedRemarks} | ${QR_REMARK}`;
};

const calculateDistanceMeters = (
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
): number => {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const latDelta = toRadians(latitudeB - latitudeA);
  const lonDelta = toRadians(longitudeB - longitudeA);
  const latARad = toRadians(latitudeA);
  const latBRad = toRadians(latitudeB);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(latARad) *
      Math.cos(latBRad) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const ensureQrAttendanceSchema = async (): Promise<void> => {
  if (!qrSchemaInitPromise) {
    qrSchemaInitPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS attendance_qr_sessions (
          session_id SERIAL PRIMARY KEY,
          session_token VARCHAR(128) NOT NULL UNIQUE,
          center_id INT NOT NULL REFERENCES edu_centers(center_id),
          teacher_id INT NOT NULL REFERENCES teachers(teacher_id),
          class_id INT NOT NULL REFERENCES classes(class_id),
          attendance_date DATE NOT NULL,
          room_number_snapshot VARCHAR(50),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          finalized_at TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          location_required BOOLEAN NOT NULL DEFAULT FALSE,
          location_latitude NUMERIC(10, 7),
          location_longitude NUMERIC(10, 7),
          location_accuracy_meters NUMERIC(8, 2),
          location_radius_meters NUMERIC(8, 2),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        ALTER TABLE attendance_qr_sessions
        ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS attendance_qr_checkins (
          qr_checkin_id SERIAL PRIMARY KEY,
          session_id INT NOT NULL REFERENCES attendance_qr_sessions(session_id) ON DELETE CASCADE,
          student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
          attendance_id INT REFERENCES attendance(attendance_id) ON DELETE SET NULL,
          checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          latitude NUMERIC(10, 7),
          longitude NUMERIC(10, 7),
          accuracy_meters NUMERIC(8, 2),
          distance_meters NUMERIC(8, 2),
          location_validated BOOLEAN NOT NULL DEFAULT FALSE,
          device_info TEXT,
          UNIQUE(session_id, student_id)
        )
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_attendance_qr_sessions_class_date
        ON attendance_qr_sessions(class_id, attendance_date)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_attendance_qr_sessions_expires_at
        ON attendance_qr_sessions(expires_at)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_attendance_qr_checkins_session
        ON attendance_qr_checkins(session_id, checked_in_at DESC)
      `);
    })().catch((error: any) => {
      qrSchemaInitPromise = null;
      throw error;
    });
  }

  return qrSchemaInitPromise;
};

const getClassForQrSession = async (classId: number, centerId: number) => {
  const result = await db.query(
    `
      SELECT
        c.class_id,
        c.class_name,
        c.class_code,
        c.center_id,
        c.teacher_id,
        c.room_number,
        t.first_name AS teacher_first_name,
        t.last_name AS teacher_last_name
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.teacher_id
      WHERE c.class_id = $1 AND c.center_id = $2
    `,
    [classId, centerId]
  );

  return result.rows[0] || null;
};

const getQrSessionByToken = async (sessionToken: string) => {
  const result = await db.query(
    `
      SELECT
        s.*,
        (s.is_active = TRUE AND s.expires_at > LOCALTIMESTAMP) AS active,
        GREATEST(EXTRACT(EPOCH FROM (s.expires_at - LOCALTIMESTAMP)), 0) AS seconds_until_expiry,
        c.class_name,
        c.class_code,
        c.room_number,
        t.first_name AS teacher_first_name,
        t.last_name AS teacher_last_name
      FROM attendance_qr_sessions s
      JOIN classes c ON s.class_id = c.class_id
      LEFT JOIN teachers t ON s.teacher_id = t.teacher_id
      WHERE s.session_token = $1
    `,
    [sessionToken]
  );

  return result.rows[0] || null;
};

const finalizeQrAttendanceSession = async (client: any, session: any) => {
  if (session.finalized_at) {
    return [];
  }

  const absentStudents = await client.query(
    `
      SELECT s.student_id
      FROM students s
      LEFT JOIN attendance_qr_checkins qc
        ON qc.student_id = s.student_id
       AND qc.session_id = $2
      LEFT JOIN attendance a
        ON a.student_id = s.student_id
       AND a.class_id = $1
       AND a.attendance_date = $3
      WHERE s.class_id = $1
        AND qc.qr_checkin_id IS NULL
        AND a.attendance_id IS NULL
    `,
    [session.class_id, session.session_id, session.attendance_date]
  );

  const finalizedAttendance: any[] = [];
  for (const student of absentStudents.rows) {
    const attendance = await upsertAttendanceRecord(client, {
      student_id: Number(student.student_id),
      teacher_id: Number(session.teacher_id),
      class_id: Number(session.class_id),
      attendance_date: String(session.attendance_date).split('T')[0],
      status: ABSENT_ATTENDANCE_STATUS,
      remarks: 'Missed QR attendance deadline',
    });
    finalizedAttendance.push(attendance);
  }

  await client.query(
    `
      UPDATE attendance_qr_sessions
      SET is_active = FALSE,
          finalized_at = COALESCE(finalized_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $1
    `,
    [session.session_id]
  );

  return finalizedAttendance;
};

const finalizeExpiredQrAttendanceSessions = async (centerId: number, teacherId?: number | null) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const values: any[] = [centerId];
    const filters = [
      'center_id = $1',
      'is_active = TRUE',
      'expires_at <= LOCALTIMESTAMP',
      'finalized_at IS NULL',
    ];

    if (teacherId) {
      values.push(teacherId);
      filters.push(`teacher_id = $${values.length}`);
    }

    const expiredSessions = await client.query(
      `
        SELECT *
        FROM attendance_qr_sessions
        WHERE ${filters.join(' AND ')}
        ORDER BY expires_at ASC
      `,
      values
    );

    const finalizedAttendance: any[] = [];
    for (const session of expiredSessions.rows) {
      finalizedAttendance.push(...(await finalizeQrAttendanceSession(client, session)));
    }

    await client.query('COMMIT');

    finalizedAttendance.forEach((attendance) => {
      void notifyParentsAboutAttendance(attendance, {
        source: 'qr',
        eventKey: `attendance-qr-absent:${attendance.attendance_id}:${attendance.attendance_date}`,
      });
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const upsertAttendanceRecord = async (
  client: any,
  record: {
    student_id: number;
    teacher_id: number;
    class_id: number;
    attendance_date: string;
    status?: string;
    remarks?: string | null;
  }
) => {
  const { student_id, teacher_id, class_id, attendance_date } = record;
  const status = record.status || DEFAULT_ATTENDANCE_STATUS;

  const existing = await client.query(
    `
      SELECT *
      FROM attendance
      WHERE student_id = $1 AND class_id = $2 AND attendance_date = $3
      ORDER BY attendance_id DESC
      LIMIT 1
    `,
    [student_id, class_id, attendance_date]
  );

  if (existing.rows.length > 0) {
    const existingAttendance = existing.rows[0];
    const updated = await client.query(
      `
        UPDATE attendance
        SET
          teacher_id = COALESCE($1, teacher_id),
          status = COALESCE($2, status),
          remarks = $3
        WHERE attendance_id = $4
        RETURNING *
      `,
      [
        teacher_id || existingAttendance.teacher_id,
        status,
        record.remarks !== undefined ? record.remarks : existingAttendance.remarks,
        existingAttendance.attendance_id,
      ]
    );

    return updated.rows[0];
  }

  const inserted = await client.query(
    `
      INSERT INTO attendance (student_id, teacher_id, class_id, attendance_date, status, remarks)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [student_id, teacher_id, class_id, attendance_date, status, record.remarks ?? null]
  );

  return inserted.rows[0];
};

const validateAttendanceScope = async (
  client: any,
  req: any,
  record: {
    student_id: number;
    teacher_id: number;
    class_id: number;
  }
) => {
  const classResult = await client.query(
    `
      SELECT class_id, center_id, teacher_id, class_name
      FROM classes
      WHERE class_id = $1
    `,
    [record.class_id]
  );

  const classRecord = classResult.rows[0];
  if (!classRecord) {
    return { valid: false, status: 404, error: 'Class not found' };
  }

  if (req.user?.userType !== 'student' && Number(classRecord.center_id) !== Number(req.user?.center_id)) {
    return { valid: false, status: 403, error: 'This class is outside your center.' };
  }

  if (req.user?.userType === 'teacher' && Number(classRecord.teacher_id) !== Number(req.user.id)) {
    return { valid: false, status: 403, error: 'You can only manage attendance for your own classes.' };
  }

  if (classRecord.teacher_id && Number(record.teacher_id) !== Number(classRecord.teacher_id)) {
    return { valid: false, status: 400, error: 'teacher_id must match the class assigned teacher.' };
  }

  const studentResult = await client.query(
    `
      SELECT student_id, center_id, class_id
      FROM students
      WHERE student_id = $1
    `,
    [record.student_id]
  );

  const student = studentResult.rows[0];
  if (!student) {
    return { valid: false, status: 404, error: 'Student not found' };
  }

  if (Number(student.center_id) !== Number(classRecord.center_id)) {
    return { valid: false, status: 400, error: 'Student and class must belong to the same center.' };
  }

  if (Number(student.class_id) !== Number(record.class_id)) {
    return { valid: false, status: 400, error: 'Student is not enrolled in this class.' };
  }

  return { valid: true, classRecord };
};

const canAccessAttendanceRecord = (req: any, record: any): boolean => {
  if (req.user?.userType === 'student') {
    return Number(record.student_id) === Number(req.user.id);
  }

  if (req.user?.userType === 'teacher') {
    return Number(record.teacher_id) === Number(req.user.id);
  }

  if (req.user?.userType === 'superuser') {
    return Number(record.center_id) === Number(req.user.center_id);
  }

  return false;
};

exports.getAllAttendance = async (req: any, res: any) => {
  try {
    const center_id = req.user?.center_id;
    if (!center_id) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const filters = ['c.center_id = $1'];
    const values: any[] = [center_id];

    if (req.user?.userType === 'teacher') {
      values.push(req.user.id);
      filters.push(`a.teacher_id = $${values.length}`);
    }

    const result = await db.query(
      `
        SELECT
          a.*,
          c.center_id,
          c.class_name,
          c.class_code,
          s.first_name AS student_first_name,
          s.last_name AS student_last_name,
          t.first_name AS teacher_first_name,
          t.last_name AS teacher_last_name
        FROM attendance a
        JOIN classes c ON a.class_id = c.class_id
        JOIN students s ON a.student_id = s.student_id
        JOIN teachers t ON a.teacher_id = t.teacher_id
        WHERE ${filters.join(' AND ')}
        ORDER BY a.attendance_date DESC, a.attendance_id DESC
      `,
      values
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

exports.getAttendanceById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `
        SELECT
          a.*,
          c.center_id,
          c.class_name,
          c.class_code,
          s.first_name AS student_first_name,
          s.last_name AS student_last_name,
          t.first_name AS teacher_first_name,
          t.last_name AS teacher_last_name
        FROM attendance a
        JOIN classes c ON a.class_id = c.class_id
        JOIN students s ON a.student_id = s.student_id
        JOIN teachers t ON a.teacher_id = t.teacher_id
        WHERE a.attendance_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance not found' });
    }

    if (!canAccessAttendanceRecord(req, result.rows[0])) {
      return res.status(403).json({ error: 'You cannot view this attendance record.' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message || error.toString() });
  }
};

exports.createAttendance = async (req: any, res: any) => {
  const client = await db.connect();

  try {
    const {
      student_id,
      teacher_id,
      class_id,
      attendance_date,
      status,
      remarks,
    } = req.body;

    if (!student_id || !class_id || !attendance_date) {
      return res.status(400).json({ error: 'student_id, class_id and attendance_date are required' });
    }

    if (!isValidIsoDate(attendance_date)) {
      return res.status(400).json({ error: 'attendance_date must be in YYYY-MM-DD format' });
    }

    const resolvedTeacherId =
      teacher_id || (req.user?.userType === 'teacher' ? req.user.id : null);

    if (!resolvedTeacherId) {
      return res.status(400).json({ error: 'teacher_id is required' });
    }

    const scope = await validateAttendanceScope(client, req, {
      student_id: Number(student_id),
      teacher_id: Number(resolvedTeacherId),
      class_id: Number(class_id),
    });

    if (!scope.valid) {
      return res.status(scope.status || 400).json({ error: scope.error });
    }

    await client.query('BEGIN');
    const attendance = await upsertAttendanceRecord(client, {
      student_id: Number(student_id),
      teacher_id: Number(resolvedTeacherId),
      class_id: Number(class_id),
      attendance_date,
      status,
      remarks,
    });
    await client.query('COMMIT');
    void notifyParentsAboutAttendance(attendance, {
      source: 'manual',
      eventKey: `attendance-manual:${attendance.attendance_id}:${attendance.status}:${attendance.attendance_date}:${attendance.remarks || ''}`,
    });

    res.status(201).json(attendance);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create attendance', details: error.message || error.toString() });
  } finally {
    client.release();
  }
};

exports.updateAttendance = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const existingResult = await db.query(
      `
        SELECT a.*, c.center_id
        FROM attendance a
        JOIN classes c ON c.class_id = a.class_id
        WHERE a.attendance_id = $1
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance not found' });
    }

    if (!canAccessAttendanceRecord(req, existingResult.rows[0])) {
      return res.status(403).json({ error: 'You cannot update this attendance record.' });
    }

    const result = await db.query(
      `
        UPDATE attendance
        SET
          status = COALESCE($1, status),
          remarks = COALESCE($2, remarks)
        WHERE attendance_id = $3
        RETURNING *
      `,
      [status, remarks, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance not found' });
    }

    void notifyParentsAboutAttendance(result.rows[0], {
      source: 'update',
      eventKey: `attendance-update:${result.rows[0].attendance_id}:${result.rows[0].status}:${result.rows[0].remarks || ''}`,
    });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update attendance', details: error.message || error.toString() });
  }
};

exports.getAttendanceByStudent = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const parsedStudentId = Number(studentId);

    if (req.user?.userType === 'student' && req.user.id !== parsedStudentId) {
      return res.status(403).json({ error: 'You can only view your own attendance records.' });
    }

    const studentAccess = await db.query(
      `
        SELECT s.student_id, s.center_id, s.class_id, c.teacher_id
        FROM students s
        LEFT JOIN classes c ON c.class_id = s.class_id
        WHERE s.student_id = $1
      `,
      [parsedStudentId]
    );

    if (studentAccess.rows.length === 0) {
      return res.json([]);
    }

    const student = studentAccess.rows[0];
    if (req.user?.userType === 'superuser' && Number(student.center_id) !== Number(req.user.center_id)) {
      return res.status(403).json({ error: 'You can only view students from your own center.' });
    }

    if (req.user?.userType === 'teacher' && Number(student.teacher_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only view attendance for students in your classes.' });
    }

    const result = await db.query(
      `
        SELECT
          a.*,
          c.class_name,
          c.class_code,
          t.first_name AS teacher_first_name,
          t.last_name AS teacher_last_name
        FROM attendance a
        LEFT JOIN classes c ON a.class_id = c.class_id
        LEFT JOIN teachers t ON a.teacher_id = t.teacher_id
        WHERE a.student_id = $1
        ORDER BY a.attendance_date DESC, a.attendance_id DESC
      `,
      [parsedStudentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

exports.getAttendanceByClass = async (req: any, res: any) => {
  try {
    const { classId } = req.params;
    const parsedClassId = Number(classId);

    const classAccess = await db.query(
      `
        SELECT class_id, center_id, teacher_id
        FROM classes
        WHERE class_id = $1
      `,
      [parsedClassId]
    );

    if (classAccess.rows.length === 0) {
      return res.json([]);
    }

    const classRecord = classAccess.rows[0];
    if (req.user?.userType === 'student' && req.user.class_id !== parsedClassId) {
      return res.status(403).json({ error: 'You can only view attendance for your own class.' });
    }

    if (req.user?.userType === 'teacher' && Number(classRecord.teacher_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only view attendance for your own classes.' });
    }

    if (req.user?.userType === 'superuser' && Number(classRecord.center_id) !== Number(req.user.center_id)) {
      return res.status(403).json({ error: 'You can only view attendance for classes in your own center.' });
    }

    const result = await db.query(
      `
        SELECT
          a.*,
          s.first_name AS student_first_name,
          s.last_name AS student_last_name,
          s.enrollment_number,
          c.class_name,
          c.class_code
        FROM attendance a
        LEFT JOIN students s ON a.student_id = s.student_id
        LEFT JOIN classes c ON a.class_id = c.class_id
        WHERE a.class_id = $1
        ORDER BY a.attendance_date DESC, a.attendance_id DESC
      `,
      [parsedClassId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

exports.deleteAttendance = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existingResult = await db.query(
      `
        SELECT a.*, c.center_id
        FROM attendance a
        JOIN classes c ON c.class_id = a.class_id
        WHERE a.attendance_id = $1
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    if (!canAccessAttendanceRecord(req, existingResult.rows[0])) {
      return res.status(403).json({ error: 'You cannot delete this attendance record.' });
    }

    const result = await db.query('DELETE FROM attendance WHERE attendance_id = $1 RETURNING *', [id]);

    res.json({ message: 'Attendance record deleted successfully', attendance: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete attendance', details: error.message || error.toString() });
  }
};

exports.createBulkAttendance = async (req: any, res: any) => {
  const client = await db.connect();

  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records must be a non-empty array' });
    }

    const results: any[] = [];
    await client.query('BEGIN');

    for (const record of records) {
      const {
        student_id,
        teacher_id,
        class_id,
        attendance_date,
        status,
        remarks,
      } = record;

      if (!student_id || !class_id || !attendance_date) {
        throw new Error('Each attendance record must include student_id, class_id, and attendance_date');
      }

      if (!isValidIsoDate(attendance_date)) {
        throw new Error('attendance_date must be in YYYY-MM-DD format');
      }

      const resolvedTeacherId =
        teacher_id || (req.user?.userType === 'teacher' ? req.user.id : null);

      if (!resolvedTeacherId) {
        throw new Error('teacher_id is required for each attendance record');
      }

      const scope = await validateAttendanceScope(client, req, {
        student_id: Number(student_id),
        teacher_id: Number(resolvedTeacherId),
        class_id: Number(class_id),
      });

      if (!scope.valid) {
        const scopeError: any = new Error(scope.error);
        scopeError.status = scope.status || 400;
        throw scopeError;
      }

      const attendance = await upsertAttendanceRecord(client, {
        student_id: Number(student_id),
        teacher_id: Number(resolvedTeacherId),
        class_id: Number(class_id),
        attendance_date,
        status,
        remarks,
      });

      results.push(attendance);
    }

    await client.query('COMMIT');
    results.forEach((attendance) => {
      void notifyParentsAboutAttendance(attendance, {
        source: 'manual',
        eventKey: `attendance-manual:${attendance.attendance_id}:${attendance.status}:${attendance.attendance_date}:${attendance.remarks || ''}`,
      });
    });
    res.status(201).json({
      message: `${results.length} attendance records saved successfully`,
      attendance: results,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to create bulk attendance', details: error.message || error.toString() });
  } finally {
    client.release();
  }
};

exports.createQrAttendanceSession = async (req: any, res: any) => {
  try {
    await ensureQrAttendanceSchema();

    const centerId = req.user?.center_id;
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const classId = Number(req.body.class_id);
    const attendanceDate = req.body.attendance_date || new Date().toISOString().split('T')[0];
    const expiryMinutes = clamp(
      Number(req.body.expires_in_minutes) || DEFAULT_QR_EXPIRY_MINUTES,
      MIN_QR_EXPIRY_MINUTES,
      MAX_QR_EXPIRY_MINUTES
    );
    const locationRequired = Boolean(req.body.location_required);
    const locationLatitude = toNullableNumber(req.body.location_latitude);
    const locationLongitude = toNullableNumber(req.body.location_longitude);
    const locationAccuracyMeters = toNullableNumber(req.body.location_accuracy_meters);
    const locationRadiusMeters = clamp(
      Number(req.body.location_radius_meters) || DEFAULT_LOCATION_RADIUS_METERS,
      MIN_LOCATION_RADIUS_METERS,
      MAX_LOCATION_RADIUS_METERS
    );

    if (!classId) {
      return res.status(400).json({ error: 'class_id is required' });
    }

    if (!isValidIsoDate(attendanceDate)) {
      return res.status(400).json({ error: 'attendance_date must be in YYYY-MM-DD format' });
    }

    const classRecord = await getClassForQrSession(classId, centerId);
    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found for your center' });
    }

    if (req.user?.userType === 'teacher' && Number(classRecord.teacher_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only generate QR attendance for your own classes.' });
    }

    const teacherId =
      req.user?.userType === 'teacher'
        ? Number(req.user.id)
        : Number(req.body.teacher_id || classRecord.teacher_id);

    if (!teacherId) {
      return res.status(400).json({ error: 'teacher_id is required for this class' });
    }

    if (locationRequired && (locationLatitude === null || locationLongitude === null)) {
      return res.status(400).json({ error: 'Teacher location is required when location validation is enabled.' });
    }

    const sessionToken = cryptoModule.randomBytes(24).toString('hex');
    await db.query(
      `
        UPDATE attendance_qr_sessions
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE teacher_id = $1
          AND class_id = $2
          AND attendance_date = $3
          AND is_active = TRUE
      `,
      [teacherId, classId, attendanceDate]
    );

    const result = await db.query(
      `
        INSERT INTO attendance_qr_sessions (
          session_token,
          center_id,
          teacher_id,
          class_id,
          attendance_date,
          room_number_snapshot,
          expires_at,
          location_required,
          location_latitude,
          location_longitude,
          location_accuracy_meters,
          location_radius_meters
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          LOCALTIMESTAMP + ($7::int * INTERVAL '1 minute'),
          $8,
          $9,
          $10,
          $11,
          $12
        )
        RETURNING *
      `,
      [
        sessionToken,
        centerId,
        teacherId,
        classId,
        attendanceDate,
        classRecord.room_number || null,
        expiryMinutes,
        locationRequired,
        locationLatitude,
        locationLongitude,
        locationAccuracyMeters,
        locationRequired ? locationRadiusMeters : null,
      ]
    );

    res.status(201).json({
      message: 'QR attendance session created successfully',
      session: {
        ...result.rows[0],
        class_name: classRecord.class_name,
        class_code: classRecord.class_code,
        teacher_name:
          classRecord.teacher_first_name && classRecord.teacher_last_name
            ? `${classRecord.teacher_first_name} ${classRecord.teacher_last_name}`
            : null,
        active: true,
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Failed to create QR attendance session',
      details: error.message || error.toString(),
    });
  }
};

exports.getQrAttendanceSessions = async (req: any, res: any) => {
  try {
    await ensureQrAttendanceSchema();

    const centerId = req.user?.center_id;
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    await finalizeExpiredQrAttendanceSessions(
      Number(centerId),
      req.user?.userType === 'teacher' ? Number(req.user.id) : null
    );

    const filters: string[] = ['s.center_id = $1'];
    const values: any[] = [centerId];

    if (req.user?.userType === 'teacher') {
      values.push(req.user.id);
      filters.push(`s.teacher_id = $${values.length}`);
    }

    if (req.query.class_id) {
      values.push(Number(req.query.class_id));
      filters.push(`s.class_id = $${values.length}`);
    }

    if (req.query.attendance_date) {
      values.push(req.query.attendance_date);
      filters.push(`s.attendance_date = $${values.length}`);
    }

    if (req.query.active_only !== 'false') {
      filters.push('s.is_active = TRUE');
      filters.push('s.expires_at > LOCALTIMESTAMP');
    }

    const result = await db.query(
      `
        SELECT
          s.*,
          (s.is_active = TRUE AND s.expires_at > LOCALTIMESTAMP) AS active,
          GREATEST(EXTRACT(EPOCH FROM (s.expires_at - LOCALTIMESTAMP)), 0) AS seconds_until_expiry,
          c.class_name,
          c.class_code,
          t.first_name AS teacher_first_name,
          t.last_name AS teacher_last_name
        FROM attendance_qr_sessions s
        JOIN classes c ON s.class_id = c.class_id
        LEFT JOIN teachers t ON s.teacher_id = t.teacher_id
        WHERE ${filters.join(' AND ')}
        ORDER BY s.created_at DESC
      `,
      values
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Failed to fetch QR attendance sessions',
      details: error.message || error.toString(),
    });
  }
};

exports.getQrAttendanceSession = async (req: any, res: any) => {
  try {
    await ensureQrAttendanceSchema();

    const { sessionToken } = req.params;
    const session = await getQrSessionByToken(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'QR attendance session not found' });
    }

    const isTeacher = req.user?.userType === 'teacher';
    const isStudent = req.user?.userType === 'student';
    const isSuperuser = req.user?.userType === 'superuser';

    if (isTeacher && Number(session.teacher_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only view your own QR attendance sessions.' });
    }

    if (isSuperuser && Number(session.center_id) !== Number(req.user.center_id)) {
      return res.status(403).json({ error: 'You can only view QR sessions for your own center.' });
    }

    if (session.is_active && new Date(session.expires_at).getTime() <= Date.now() && !session.finalized_at) {
      await finalizeExpiredQrAttendanceSessions(Number(session.center_id), null);
    }

    const active = Boolean(session.active);

    const sessionData = {
      session_id: session.session_id,
      session_token: session.session_token,
      class_id: session.class_id,
      class_name: session.class_name,
      class_code: session.class_code,
      teacher_id: session.teacher_id,
      teacher_name:
        session.teacher_first_name && session.teacher_last_name
          ? `${session.teacher_first_name} ${session.teacher_last_name}`
          : null,
      attendance_date: session.attendance_date,
      room_number: session.room_number_snapshot || session.room_number || null,
      created_at: session.created_at,
      expires_at: session.expires_at,
      active,
      location_required: session.location_required,
      location_radius_meters: session.location_radius_meters,
    };

    if (isStudent) {
      const existingCheckIn = await db.query(
        `
          SELECT checked_in_at, distance_meters, location_validated
          FROM attendance_qr_checkins
          WHERE session_id = $1 AND student_id = $2
        `,
        [session.session_id, req.user.id]
      );

      return res.json({
        session: sessionData,
        eligible: Number(req.user.class_id) === Number(session.class_id),
        already_checked_in: existingCheckIn.rows.length > 0,
        check_in: existingCheckIn.rows[0] || null,
      });
    }

    const roster = await db.query(
      `
        SELECT
          s.student_id,
          s.first_name,
          s.last_name,
          s.enrollment_number,
          a.status AS attendance_status,
          qc.checked_in_at,
          qc.distance_meters,
          qc.location_validated
        FROM students s
        LEFT JOIN attendance a
          ON a.student_id = s.student_id
         AND a.class_id = $2
         AND a.attendance_date = $3
        LEFT JOIN attendance_qr_checkins qc
          ON qc.student_id = s.student_id
         AND qc.session_id = $1
        WHERE s.class_id = $2
        ORDER BY s.first_name, s.last_name, s.student_id
      `,
      [session.session_id, session.class_id, session.attendance_date]
    );

    const checkedInCount = roster.rows.filter((student: any) => student.checked_in_at).length;

    res.json({
      session: sessionData,
      roster: roster.rows,
      summary: {
        total_students: roster.rows.length,
        checked_in_students: checkedInCount,
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Failed to fetch QR attendance session',
      details: error.message || error.toString(),
    });
  }
};

exports.closeQrAttendanceSession = async (req: any, res: any) => {
  const client = await db.connect();

  try {
    await ensureQrAttendanceSchema();

    const { sessionToken } = req.params;
    const session = await getQrSessionByToken(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'QR attendance session not found' });
    }

    if (req.user?.userType === 'teacher' && Number(session.teacher_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only close your own QR attendance sessions.' });
    }

    if (req.user?.userType === 'superuser' && Number(session.center_id) !== Number(req.user.center_id)) {
      return res.status(403).json({ error: 'You can only close QR sessions for your own center.' });
    }

    await client.query('BEGIN');
    const finalizedAttendance = await finalizeQrAttendanceSession(client, session);
    const result = await client.query(
      'SELECT * FROM attendance_qr_sessions WHERE session_token = $1',
      [sessionToken]
    );
    await client.query('COMMIT');

    finalizedAttendance.forEach((attendance) => {
      void notifyParentsAboutAttendance(attendance, {
        source: 'qr',
        eventKey: `attendance-qr-absent:${attendance.attendance_id}:${attendance.attendance_date}`,
      });
    });

    res.json({
      message: `QR attendance session closed successfully. ${finalizedAttendance.length} absent records saved.`,
      session: result.rows[0],
      absent_saved: finalizedAttendance.length,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Failed to close QR attendance session',
      details: error.message || error.toString(),
    });
  } finally {
    client.release();
  }
};

exports.checkInWithQrAttendanceSession = async (req: any, res: any) => {
  const client = await db.connect();

  try {
    await ensureQrAttendanceSchema();

    const { sessionToken } = req.params;
    const session = await getQrSessionByToken(sessionToken);

    if (!session) {
      return res.status(404).json({ error: 'QR attendance session not found' });
    }

    if (!session.active) {
      return res.status(400).json({ error: 'This QR attendance session has expired or been closed.' });
    }

    if (Number(req.user?.class_id) !== Number(session.class_id)) {
      return res.status(403).json({ error: 'This QR code is not for your class.' });
    }

    const priorCheckIn = await db.query(
      `
        SELECT
          qc.*,
          a.attendance_id,
          a.student_id,
          a.teacher_id,
          a.class_id,
          a.attendance_date,
          a.status,
          a.remarks
        FROM attendance_qr_checkins qc
        LEFT JOIN attendance a ON a.attendance_id = qc.attendance_id
        WHERE qc.session_id = $1 AND qc.student_id = $2
      `,
      [session.session_id, req.user.id]
    );

    if (priorCheckIn.rows.length > 0) {
      const existing = priorCheckIn.rows[0];
      return res.json({
        message: 'Attendance already checked in successfully',
        already_checked_in: true,
        attendance: existing.attendance_id
          ? {
              attendance_id: existing.attendance_id,
              student_id: existing.student_id,
              teacher_id: existing.teacher_id,
              class_id: existing.class_id,
              attendance_date: existing.attendance_date,
              status: existing.status,
              remarks: existing.remarks,
            }
          : null,
        check_in: {
          qr_checkin_id: existing.qr_checkin_id,
          session_id: existing.session_id,
          student_id: existing.student_id,
          attendance_id: existing.attendance_id,
          checked_in_at: existing.checked_in_at,
          latitude: existing.latitude,
          longitude: existing.longitude,
          accuracy_meters: existing.accuracy_meters,
          distance_meters: existing.distance_meters,
          location_validated: existing.location_validated,
        },
        session: {
          session_id: session.session_id,
          class_id: session.class_id,
          class_name: session.class_name,
          attendance_date: session.attendance_date,
        },
      });
    }

    const latitude = toNullableNumber(req.body.latitude);
    const longitude = toNullableNumber(req.body.longitude);
    const accuracyMeters = toNullableNumber(req.body.accuracy_meters);
    let distanceMeters: number | null = null;
    let locationValidated = !session.location_required;

    if (session.location_required) {
      if (latitude === null || longitude === null) {
        return res.status(400).json({ error: 'Location access is required for this attendance session.' });
      }

      distanceMeters = calculateDistanceMeters(
        Number(session.location_latitude),
        Number(session.location_longitude),
        latitude,
        longitude
      );

      const allowedDistance =
        Number(session.location_radius_meters || 0) +
        Math.max(Number(session.location_accuracy_meters || 0), 0) +
        Math.max(Number(accuracyMeters || 0), 0);

      locationValidated = distanceMeters <= allowedDistance;

      if (!locationValidated) {
        return res.status(403).json({
          error: 'You appear to be too far away from the class location for this QR attendance.',
          distance_meters: Math.round(distanceMeters),
          allowed_distance_meters: Math.round(allowedDistance),
        });
      }
    }

    await client.query('BEGIN');

    const existingAttendance = await client.query(
      `
        SELECT attendance_id, remarks
        FROM attendance
        WHERE student_id = $1 AND class_id = $2 AND attendance_date = $3
        ORDER BY attendance_id DESC
        LIMIT 1
      `,
      [req.user.id, session.class_id, session.attendance_date]
    );

    let attendanceRecord;
    if (existingAttendance.rows.length > 0) {
      const updatedAttendance = await client.query(
        `
          UPDATE attendance
          SET
            teacher_id = $1,
            status = $2,
            remarks = $3
          WHERE attendance_id = $4
          RETURNING *
        `,
        [
          session.teacher_id,
          DEFAULT_ATTENDANCE_STATUS,
          appendQrRemark(existingAttendance.rows[0].remarks),
          existingAttendance.rows[0].attendance_id,
        ]
      );
      attendanceRecord = updatedAttendance.rows[0];
    } else {
      const insertedAttendance = await client.query(
        `
          INSERT INTO attendance (student_id, teacher_id, class_id, attendance_date, status, remarks)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [
          req.user.id,
          session.teacher_id,
          session.class_id,
          session.attendance_date,
          DEFAULT_ATTENDANCE_STATUS,
          QR_REMARK,
        ]
      );
      attendanceRecord = insertedAttendance.rows[0];
    }

    const checkInResult = await client.query(
      `
        INSERT INTO attendance_qr_checkins (
          session_id,
          student_id,
          attendance_id,
          latitude,
          longitude,
          accuracy_meters,
          distance_meters,
          location_validated,
          device_info
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (session_id, student_id)
        DO NOTHING
        RETURNING *
      `,
      [
        session.session_id,
        req.user.id,
        attendanceRecord.attendance_id,
        latitude,
        longitude,
        accuracyMeters,
        distanceMeters,
        locationValidated,
        req.headers['user-agent'] || null,
      ]
    );

    await client.query('COMMIT');

    if (checkInResult.rows.length === 0) {
      const existingCheckIn = await db.query(
        `
          SELECT *
          FROM attendance_qr_checkins
          WHERE session_id = $1 AND student_id = $2
        `,
        [session.session_id, req.user.id]
      );

      return res.json({
        message: 'Attendance already checked in successfully',
        already_checked_in: true,
        attendance: attendanceRecord,
        check_in: existingCheckIn.rows[0] || null,
        session: {
          session_id: session.session_id,
          class_id: session.class_id,
          class_name: session.class_name,
          attendance_date: session.attendance_date,
        },
      });
    }

    await notifyParentsAboutAttendance(attendanceRecord, {
      source: 'qr',
      exactTimestamp: checkInResult.rows[0]?.checked_in_at || new Date(),
      eventKey: `attendance-qr:${session.session_id}:${attendanceRecord.attendance_id}`,
    });

    res.json({
      message: 'Attendance checked in successfully',
      attendance: attendanceRecord,
      check_in: checkInResult.rows[0],
      session: {
        session_id: session.session_id,
        class_id: session.class_id,
        class_name: session.class_name,
        attendance_date: session.attendance_date,
      },
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Failed to check in with QR attendance',
      details: error.message || error.toString(),
    });
  } finally {
    client.release();
  }
};
