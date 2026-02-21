const express_grade = require('express');
const router_grade = express_grade.Router();
const gradeController = require('../controllers/gradeController');

/**
 * @swagger
 * /grades:
 *   get:
 *     summary: Get all grades
 *     tags: [Grades]
 *     responses:
 *       200:
 *         description: List of all grades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Grade'
 */
router_grade.get('/', gradeController.getAllGrades);

/**
 * @swagger
 * /grades/{id}:
 *   get:
 *     summary: Get grade by ID
 *     tags: [Grades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Grade details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Grade'
 *       404:
 *         description: Grade not found
 */
router_grade.get('/:id', gradeController.getGradeById);

/**
 * @swagger
 * /grades:
 *   post:
 *     summary: Create new grade
 *     tags: [Grades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Grade'
 *     responses:
 *       201:
 *         description: Grade created successfully
 *       400:
 *         description: Invalid input
 */
router_grade.post('/', gradeController.createGrade);

/**
 * @swagger
 * /grades/bulk:
 *   post:
 *     summary: Create multiple grades at once
 *     tags: [Grades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grades:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Grade'
 *     responses:
 *       201:
 *         description: Grades created successfully
 *       400:
 *         description: Invalid input
 */
router_grade.post('/bulk', gradeController.createBulkGrades);

/**
 * @swagger
 * /grades/{id}:
 *   put:
 *     summary: Update grade
 *     tags: [Grades]
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
 *             $ref: '#/components/schemas/Grade'
 *     responses:
 *       200:
 *         description: Grade updated successfully
 *       404:
 *         description: Grade not found
 */
router_grade.put('/:id', gradeController.updateGrade);

/**
 * @swagger
 * /grades/student/{studentId}:
 *   get:
 *     summary: Get grades by student ID
 *     tags: [Grades]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of grades for student
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Grade'
 *       404:
 *         description: Student not found
 */
router_grade.get('/student/:studentId', gradeController.getGradesByStudent);

/**
 * @swagger
 * /grades/{id}:
 *   delete:
 *     summary: Delete grade
 *     tags: [Grades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Grade deleted successfully
 *       404:
 *         description: Grade not found
 */
router_grade.delete('/:id', gradeController.deleteGrade);

module.exports = router_grade;