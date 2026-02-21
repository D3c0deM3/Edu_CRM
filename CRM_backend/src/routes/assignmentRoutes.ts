const express1 = require('express');
const router1 = express1.Router();
const assignmentController = require('../controllers/assignmentController');

/**
 * @swagger
 * /assignments:
 *   get:
 *     summary: Get all assignments
 *     tags: [Assignments]
 *     responses:
 *       200:
 *         description: List of all assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 */
router1.get('/', assignmentController.getAllAssignments);

/**
 * @swagger
 * /assignments/{id}:
 *   get:
 *     summary: Get assignment by ID
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Assignment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       404:
 *         description: Assignment not found
 */
router1.get('/:id', assignmentController.getAssignmentById);

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Create new assignment
 *     tags: [Assignments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Assignment'
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Invalid input
 */
router1.post('/', assignmentController.createAssignment);

/**
 * @swagger
 * /assignments/{id}:
 *   put:
 *     summary: Update assignment
 *     tags: [Assignments]
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
 *             $ref: '#/components/schemas/Assignment'
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       404:
 *         description: Assignment not found
 */
router1.put('/:id', assignmentController.updateAssignment);

/**
 * @swagger
 * /assignments/{id}:
 *   delete:
 *     summary: Delete assignment
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Assignment deleted successfully
 *       404:
 *         description: Assignment not found
 */
router1.delete('/:id', assignmentController.deleteAssignment);

module.exports = router1;