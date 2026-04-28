const express_desktop_auth = require('express');
const router_desktop_auth = express_desktop_auth.Router();
const desktopAuthController = require('../controllers/desktopAuthController');

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

module.exports = router_desktop_auth;

export {};
