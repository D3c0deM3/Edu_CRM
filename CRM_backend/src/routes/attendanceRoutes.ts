const express_att = require('express');
const router_att = express_att.Router();
const attendanceController = require('../controllers/attendanceController');

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
router_att.post('/', attendanceController.createAttendance);

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
router_att.put('/:id', attendanceController.updateAttendance);

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
router_att.delete('/:id', attendanceController.deleteAttendance);

module.exports = router_att;