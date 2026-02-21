const express_test = require('express');
const router_test = express_test.Router();
const testController = require('../controllers/testController');
const { requireRole } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Test:
 *       type: object
 *       properties:
 *         test_id:
 *           type: integer
 *         center_id:
 *           type: integer
 *         subject_id:
 *           type: integer
 *         test_name:
 *           type: string
 *         test_type:
 *           type: string
 *           enum: [multiple_choice, form_filling, essay, short_answer, true_false, matching, reading_passage, writing]
 *         description:
 *           type: string
 *         total_marks:
 *           type: integer
 *         passing_marks:
 *           type: integer
 *         duration_minutes:
 *           type: integer
 *         is_active:
 *           type: boolean
 */

// ============================================================================
// Test CRUD Routes
// ============================================================================

/**
 * @swagger
 * /tests:
 *   get:
 *     summary: Get all tests
 *     tags: [Tests]
 *     parameters:
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: test_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: subject_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of tests
 */
router_test.get('/', testController.getAllTests);

/**
 * @swagger
 * /tests/{id}:
 *   get:
 *     summary: Get test by ID with questions and passages
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Test details with questions
 *       404:
 *         description: Test not found
 */
router_test.get('/:id', testController.getTestById);

/**
 * @swagger
 * /tests:
 *   post:
 *     summary: Create a new test
 *     tags: [Tests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Test'
 *     responses:
 *       201:
 *         description: Test created successfully
 */
router_test.post('/', requireRole('superuser', 'teacher'), testController.createTest);

/**
 * @swagger
 * /tests/{id}:
 *   put:
 *     summary: Update a test
 *     tags: [Tests]
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
 *             $ref: '#/components/schemas/Test'
 *     responses:
 *       200:
 *         description: Test updated successfully
 */
router_test.put('/:id', requireRole('superuser', 'teacher'), testController.updateTest);

/**
 * @swagger
 * /tests/{id}:
 *   delete:
 *     summary: Delete a test
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Test deleted successfully
 */
router_test.delete('/:id', requireRole('superuser', 'teacher'), testController.deleteTest);

// ============================================================================
// Question Routes
// ============================================================================

/**
 * @swagger
 * /tests/{testId}/questions:
 *   post:
 *     summary: Add a question to a test
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Question added successfully
 */
router_test.post('/:testId/questions', requireRole('superuser', 'teacher'), testController.addQuestion);

/**
 * @swagger
 * /tests/questions/{questionId}:
 *   put:
 *     summary: Update a question
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Question updated successfully
 */
router_test.put('/questions/:questionId', requireRole('superuser', 'teacher'), testController.updateQuestion);

/**
 * @swagger
 * /tests/questions/{questionId}:
 *   delete:
 *     summary: Delete a question
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Question deleted successfully
 */
router_test.delete('/questions/:questionId', requireRole('superuser', 'teacher'), testController.deleteQuestion);

// ============================================================================
// Passage Routes
// ============================================================================

/**
 * @swagger
 * /tests/{testId}/passages:
 *   post:
 *     summary: Add a reading passage to a test
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Passage added successfully
 */
router_test.post('/:testId/passages', requireRole('superuser', 'teacher'), testController.addPassage);

/**
 * @swagger
 * /tests/passages/{passageId}:
 *   put:
 *     summary: Update a reading passage
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: passageId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Passage updated successfully
 */
router_test.put('/passages/:passageId', requireRole('superuser', 'teacher'), testController.updatePassage);

/**
 * @swagger
 * /tests/passages/{passageId}:
 *   delete:
 *     summary: Delete a reading passage
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: passageId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Passage deleted successfully
 */
router_test.delete('/passages/:passageId', requireRole('superuser', 'teacher'), testController.deletePassage);

// ============================================================================
// Test Submission Routes
// ============================================================================

/**
 * @swagger
 * /tests/{testId}/start:
 *   post:
 *     summary: Start a test (creates a submission)
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Test started successfully
 */
router_test.post('/:testId/start', testController.startTest);

/**
 * @swagger
 * /tests/submissions/{submissionId}/submit:
 *   post:
 *     summary: Submit answers for a test
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Test submitted successfully
 */
router_test.post('/submissions/:submissionId/submit', testController.submitTest);

/**
 * @swagger
 * /tests/submissions/{submissionId}/grade:
 *   post:
 *     summary: Grade a submission (for essay/writing questions)
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Submission graded successfully
 */
router_test.post('/submissions/:submissionId/grade', requireRole('superuser', 'teacher'), testController.gradeSubmission);

/**
 * @swagger
 * /tests/{testId}/submissions:
 *   get:
 *     summary: Get all submissions for a test
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of submissions
 */
router_test.get('/:testId/submissions', requireRole('superuser', 'teacher'), testController.getSubmissionsByTest);

/**
 * @swagger
 * /tests/submissions/{submissionId}:
 *   get:
 *     summary: Get submission details with answers
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Submission details
 */
router_test.get('/submissions/:submissionId', testController.getSubmissionDetails);

/**
 * @swagger
 * /tests/student/{studentId}/submissions:
 *   get:
 *     summary: Get all submissions by a student
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of student submissions
 */
router_test.get('/student/:studentId/submissions', testController.getSubmissionsByStudent);

// ============================================================================
// Results Routes
// ============================================================================

/**
 * @swagger
 * /tests/{testId}/results:
 *   get:
 *     summary: Get test results and statistics
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Test results and statistics
 */
router_test.get('/:testId/results', requireRole('superuser', 'teacher'), testController.getTestResults);

/**
 * @swagger
 * /tests/student/{studentId}/results:
 *   get:
 *     summary: Get all test results for a student
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Student test results
 */
router_test.get('/student/:studentId/results', testController.getStudentResults);

// ============================================================================
// Assignment Routes
// ============================================================================

/**
 * @swagger
 * /tests/{testId}/assign:
 *   post:
 *     summary: Assign a test to students/teachers/classes
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Test assigned successfully
 */
router_test.post('/:testId/assign', requireRole('superuser', 'teacher'), testController.assignTest);

/**
 * @swagger
 * /tests/assigned/{type}/{id}:
 *   get:
 *     summary: Get tests assigned to a specific entity
 *     tags: [Tests]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [student, teacher, class]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of assigned tests
 */
router_test.get('/assigned/:type/:id', testController.getAssignedTests);

module.exports = router_test;

export {};
