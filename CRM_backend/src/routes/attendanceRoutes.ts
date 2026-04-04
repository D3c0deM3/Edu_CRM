const express_att = require('express');
const router_att = express_att.Router();
const attendanceController = require('../controllers/attendanceController');
const { requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: Get all attendance records
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: List of all attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attendance'
 */
router_att.get('/', attendanceController.getAllAttendance);

router_att.post(
  '/qr-sessions',
  requireRole('superuser', 'teacher'),
  attendanceController.createQrAttendanceSession
);

router_att.get(
  '/qr-sessions',
  requireRole('superuser', 'teacher'),
  attendanceController.getQrAttendanceSessions
);

router_att.get('/qr-sessions/:sessionToken', attendanceController.getQrAttendanceSession);

router_att.post(
  '/qr-sessions/:sessionToken/check-in',
  requireRole('student'),
  attendanceController.checkInWithQrAttendanceSession
);

router_att.post(
  '/qr-sessions/:sessionToken/close',
  requireRole('superuser', 'teacher'),
  attendanceController.closeQrAttendanceSession
);

/**
 * @swagger
 * /attendance/{id}:
 *   get:
 *     summary: Get attendance record by ID
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attendance record details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Attendance'
 *       404:
 *         description: Attendance record not found
 */
router_att.get('/:id', attendanceController.getAttendanceById);

/**
 * @swagger
 * /attendance:
 *   post:
 *     summary: Create new attendance record
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Attendance'
 *     responses:
 *       201:
 *         description: Attendance record created successfully
 *       400:
 *         description: Invalid input
 */
router_att.post('/', requireRole('superuser', 'teacher'), attendanceController.createAttendance);

/**
 * @swagger
 * /attendance/bulk:
 *   post:
 *     summary: Create multiple attendance records at once
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               records:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Attendance'
 *     responses:
 *       201:
 *         description: Attendance records created successfully
 *       400:
 *         description: Invalid input
 */
router_att.post('/bulk', requireRole('superuser', 'teacher'), attendanceController.createBulkAttendance);

/**
 * @swagger
 * /attendance/{id}:
 *   put:
 *     summary: Update attendance record
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Attendance'
 *     responses:
 *       200:
 *         description: Attendance record updated successfully
 *       404:
 *         description: Attendance record not found
 */
router_att.put('/:id', requireRole('superuser', 'teacher'), attendanceController.updateAttendance);

/**
 * @swagger
 * /attendance/student/{studentId}:
 *   get:
 *     summary: Get attendance records by student ID
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of attendance records for student
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attendance'
 *       404:
 *         description: Student not found
 */
router_att.get('/student/:studentId', attendanceController.getAttendanceByStudent);

/**
 * @swagger
 * /attendance/class/{classId}:
 *   get:
 *     summary: Get attendance records by class ID
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of attendance records for class
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attendance'
 *       404:
 *         description: Class not found
 */
router_att.get('/class/:classId', attendanceController.getAttendanceByClass);

/**
 * @swagger
 * /attendance/{id}:
 *   delete:
 *     summary: Delete attendance record
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attendance record deleted successfully
 *       404:
 *         description: Attendance record not found
 */
router_att.delete('/:id', requireRole('superuser', 'teacher'), attendanceController.deleteAttendance);

module.exports = router_att;

export {};
