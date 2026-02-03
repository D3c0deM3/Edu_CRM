import express from 'express';
const router = express.Router();
import * as debtController from '../controllers/debtController';

/**
 * @swagger
 * /debts:
 *   get:
 *     summary: Get all debts
 *     tags: [Debts]
 *     responses:
 *       200:
 *         description: List of all debts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Debt'
 */
router.get('/', debtController.getAllDebts);

/**
 * @swagger
 * /debts/{id}:
 *   get:
 *     summary: Get debt by ID
 *     tags: [Debts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Debt details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Debt'
 *       404:
 *         description: Debt not found
 */
router.get('/:id', debtController.getDebtById);

/**
 * @swagger
 * /debts:
 *   post:
 *     summary: Create new debt
 *     tags: [Debts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Debt'
 *     responses:
 *       201:
 *         description: Debt created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', debtController.createDebt);

/**
 * @swagger
 * /debts/{id}:
 *   put:
 *     summary: Update debt
 *     tags: [Debts]
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
 *             $ref: '#/components/schemas/Debt'
 *     responses:
 *       200:
 *         description: Debt updated successfully
 *       404:
 *         description: Debt not found
 */
router.put('/:id', debtController.updateDebt);

/**
 * @swagger
 * /debts/student/{studentId}:
 *   get:
 *     summary: Get debts by student ID
 *     tags: [Debts]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of debts for student
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Debt'
 *       404:
 *         description: Student not found
 */
router.get('/student/:studentId', debtController.getDebtsByStudent);

/**
 * @swagger
 * /debts/{id}:
 *   delete:
 *     summary: Delete debt
 *     tags: [Debts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Debt deleted successfully
 *       404:
 *         description: Debt not found
 */
router.delete('/:id', debtController.deleteDebt);

export default router;