const express_teacher = require('express');
const router_teacher = express_teacher.Router();
const teacherController = require('../controllers/teacherController');
const { requireRole } = require('../middleware/auth');

/**
 * @swagger
 * /teachers:
 *   get:
 *     summary: Get all teachers
 *     tags: [Teachers]
 *     responses:
 *       200:
 *         description: List of all teachers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Teacher'
 */
router_teacher.get('/', teacherController.getAllTeachers);

/**
 * @swagger
 * /teachers/{id}:
 *   get:
 *     summary: Get teacher by ID
 *     tags: [Teachers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Teacher details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Teacher'
 *       404:
 *         description: Teacher not found
 */
router_teacher.get('/:id', teacherController.getTeacherById);

/**
 * @swagger
 * /teachers:
 *   post:
 *     summary: Create new teacher
 *     tags: [Teachers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Teacher'
 *     responses:
 *       201:
 *         description: Teacher created successfully
 *       400:
 *         description: Invalid input
 */
router_teacher.post('/', teacherController.createTeacher);

/**
 * @swagger
 * /teachers/{id}:
 *   put:
 *     summary: Update teacher
 *     tags: [Teachers]
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
 *             $ref: '#/components/schemas/Teacher'
 *     responses:
 *       200:
 *         description: Teacher updated successfully
 *       404:
 *         description: Teacher not found
 */
router_teacher.put('/:id', teacherController.updateTeacher);

/**
 * @swagger
 * /teachers/{id}:
 *   delete:
 *     summary: Delete teacher
 *     tags: [Teachers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Teacher deleted successfully
 *       404:
 *         description: Teacher not found
 */
router_teacher.delete('/:id', requireRole('superuser'), teacherController.deleteTeacher);

/**
 * @swagger
 * /teachers/auth/login:
 *   post:
 *     summary: Teacher login
 *     tags: [Teachers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router_teacher.post('/auth/login', teacherController.teacherLogin);

/**
 * @swagger
 * /teachers/{id}/set-password:
 *   post:
 *     summary: Set teacher password (admin operation)
 *     tags: [Teachers]
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
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password set successfully
 */
router_teacher.post('/:id/set-password', requireRole('superuser'), teacherController.setTeacherPassword);

/**
 * @swagger
 * /teachers/{id}/change-password:
 *   post:
 *     summary: Change teacher password
 *     tags: [Teachers]
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
 *             type: object
 *             required:
 *               - old_password
 *               - new_password
 *             properties:
 *               old_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router_teacher.post('/:id/change-password', teacherController.changeTeacherPassword);

module.exports = router_teacher;

export {};