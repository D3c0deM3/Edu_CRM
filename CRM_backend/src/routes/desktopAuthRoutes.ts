const express_desktop_auth = require('express');
const router_desktop_auth = express_desktop_auth.Router();
const desktopAuthController = require('../controllers/desktopAuthController');
const requireDesktopAdmin = desktopAuthController.requireDesktopAdmin;

/**
 * @swagger
 * /desktop-auth/register:
 *   post:
 *     summary: Register a user for the separate desktop app
 *     tags: [Desktop Auth]
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
 *                 example: desktop_user
 *               email:
 *                 type: string
 *                 format: email
 *                 example: desktop@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: secret123
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Username or email already exists
 */
router_desktop_auth.post('/register', desktopAuthController.register);

/**
 * @swagger
 * /desktop-auth/login:
 *   post:
 *     summary: Login a separate desktop app user and check subscription status
 *     tags: [Desktop Auth]
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
 *                 example: desktop_user
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Subscription inactive or expired
 */
router_desktop_auth.post('/login', desktopAuthController.login);

/**
 * @swagger
 * /desktop-auth/admin/login:
 *   post:
 *     summary: Login to the desktop app admin panel
 *     tags: [Desktop Auth]
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
 *                 example: Decode
 *               password:
 *                 type: string
 *                 example: Shoxrux2006@
 *     responses:
 *       200:
 *         description: Desktop admin login successful
 *       401:
 *         description: Invalid admin credentials
 */
router_desktop_auth.post('/admin/login', desktopAuthController.adminLogin);

router_desktop_auth.get('/admin/crm-owners', requireDesktopAdmin, desktopAuthController.getCrmOwners);
router_desktop_auth.post('/admin/crm-owners', requireDesktopAdmin, desktopAuthController.createCrmOwner);
router_desktop_auth.post('/admin/crm-owners/:centerId/activate', requireDesktopAdmin, desktopAuthController.activateCrmOwner);
router_desktop_auth.post('/admin/crm-owners/:centerId/deactivate', requireDesktopAdmin, desktopAuthController.deactivateCrmOwner);
router_desktop_auth.patch('/admin/crm-owners/:centerId', requireDesktopAdmin, desktopAuthController.updateCrmOwner);

/**
 * @swagger
 * /desktop-auth/admin/users:
 *   get:
 *     summary: List desktop app users and subscription information
 *     tags: [Desktop Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of desktop app users
 *       401:
 *         description: Desktop admin authentication required
 */
router_desktop_auth.get('/admin/users', requireDesktopAdmin, desktopAuthController.getUsers);

/**
 * @swagger
 * /desktop-auth/admin/users/{id}/activate:
 *   post:
 *     summary: Activate or renew a desktop app user subscription for 30 days
 *     tags: [Desktop Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Subscription activated
 *       404:
 *         description: Desktop app user not found
 */
router_desktop_auth.post('/admin/users/:id/activate', requireDesktopAdmin, desktopAuthController.activateUser);

/**
 * @swagger
 * /desktop-auth/admin/users/{id}/deactivate:
 *   post:
 *     summary: Deactivate a desktop app user subscription
 *     tags: [Desktop Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Subscription deactivated
 *       404:
 *         description: Desktop app user not found
 */
router_desktop_auth.post('/admin/users/:id/deactivate', requireDesktopAdmin, desktopAuthController.deactivateUser);

/**
 * @swagger
 * /desktop-auth/admin/users/{id}:
 *   delete:
 *     summary: Delete a desktop app user
 *     tags: [Desktop Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Desktop app user deleted
 *       404:
 *         description: Desktop app user not found
 */
router_desktop_auth.delete('/admin/users/:id', requireDesktopAdmin, desktopAuthController.deleteUser);

module.exports = router_desktop_auth;

export {};
