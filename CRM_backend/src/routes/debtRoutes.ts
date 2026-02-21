const express_debt = require('express');
const router_debt = express_debt.Router();
const debtController = require('../controllers/debtController');

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
router_debt.get('/', debtController.getAllDebts);

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
router_debt.get('/:id', debtController.getDebtById);

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
router_debt.post('/', debtController.createDebt);

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
router_debt.put('/:id', debtController.updateDebt);

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
router_debt.get('/student/:studentId', debtController.getDebtsByStudent);

/**
 * @swagger
 * /debts/student/{studentId}/summary:
 *   get:
 *     summary: Get payment summary for a student
 *     tags: [Debts]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment summary including monthly payments and debt totals
 */
router_debt.get('/student/:studentId/summary', debtController.getPaymentSummary);

/**
 * @swagger
 * /debts/analyze:
 *   get:
 *     summary: Analyze unpaid months for all students
 *     tags: [Debts]
 *     description: Analyzes payment history to find which months have not been paid by which students
 *     parameters:
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: integer
 *         description: Filter by center ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis (default is 12 months ago)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis (default is today)
 *     responses:
 *       200:
 *         description: Analysis results showing unpaid months per student
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analysis_period:
 *                   type: object
 *                 summary:
 *                   type: object
 *                 results:
 *                   type: array
 */
router_debt.get('/analyze', debtController.analyzeUnpaidMonths);

/**
 * @swagger
 * /debts/generate-from-analysis:
 *   post:
 *     summary: Generate debt records from analysis results
 *     tags: [Debts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - student_ids
 *               - monthly_fee
 *             properties:
 *               student_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               monthly_fee:
 *                 type: number
 *               center_id:
 *                 type: integer
 *               remarks:
 *                 type: string
 *     responses:
 *       201:
 *         description: Debt records created successfully
 */
router_debt.post('/generate-from-analysis', debtController.generateDebtsFromAnalysis);

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
router_debt.delete('/:id', debtController.deleteDebt);

module.exports = router_debt;