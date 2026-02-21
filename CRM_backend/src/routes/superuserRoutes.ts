const express_superuser = require('express');
const router_superuser = express_superuser.Router();
const superuserController = require('../controllers/superuserController');

/**
 * @swagger
 * /superusers:
 *   get:
 *     summary: Get all superusers
 *     tags: [Superusers]
 *     responses:
 *       200:
 *         description: List of all superusers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Superuser'
 */
router_superuser.get('/', superuserController.getAllSuperusers);

/**
 * @swagger
 * /superusers/{id}:
 *   get:
 *     summary: Get superuser by ID
 *     tags: [Superusers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Superuser details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Superuser'
 *       404:
 *         description: Superuser not found
 */
router_superuser.get('/:id', superuserController.getSuperuserById);

/**
 * @swagger
 * /superusers:
 *   post:
 *     summary: Create new superuser
 *     tags: [Superusers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Superuser'
 *     responses:
 *       201:
 *         description: Superuser created successfully
 *       400:
 *         description: Invalid input
 */
router_superuser.post('/', superuserController.createSuperuser);

/**
 * @swagger
 * /superusers/{id}:
 *   put:
 *     summary: Update superuser
 *     tags: [Superusers]
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
 *             $ref: '#/components/schemas/Superuser'
 *     responses:
 *       200:
 *         description: Superuser updated successfully
 *       404:
 *         description: Superuser not found
 */
router_superuser.put('/:id', superuserController.updateSuperuser);

/**
 * @swagger
 * /superusers/{id}:
 *   delete:
 *     summary: Delete superuser
 *     tags: [Superusers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Superuser deleted successfully
 *       404:
 *         description: Superuser not found
 */
router_superuser.delete('/:id', superuserController.deleteSuperuser);

/**
 * @swagger
 * /superusers/auth/login:
 *   post:
 *     summary: Superuser login
 *     tags: [Superusers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - username
 *               - password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account locked or inactive
 */
router_superuser.post('/auth/login', superuserController.login);

/**
 * @swagger
 * /superusers/{id}/change-password:
 *   post:
 *     summary: Change superuser password
 *     tags: [Superusers]
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
 *             properties:
 *               old_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *             required:
 *               - old_password
 *               - new_password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 *       404:
 *         description: Superuser not found
 */
router_superuser.post('/:id/change-password', superuserController.changePassword);

module.exports = router_superuser;
