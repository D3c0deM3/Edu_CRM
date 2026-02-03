import express from 'express';
const router = express.Router();
import * as centerController from '../controllers/centerController';

/**
 * @swagger
 * /centers:
 *   get:
 *     summary: Get all centers
 *     tags: [Centers]
 *     responses:
 *       200:
 *         description: List of all centers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Center'
 */
router.get('/', centerController.getAllCenters);

/**
 * @swagger
 * /centers/{id}:
 *   get:
 *     summary: Get center by ID
 *     tags: [Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Center details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Center'
 *       404:
 *         description: Center not found
 */
router.get('/:id', centerController.getCenterById);

/**
 * @swagger
 * /centers:
 *   post:
 *     summary: Create new center
 *     tags: [Centers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Center'
 *     responses:
 *       201:
 *         description: Center created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', centerController.createCenter);

/**
 * @swagger
 * /centers/{id}:
 *   put:
 *     summary: Update center
 *     tags: [Centers]
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
 *             $ref: '#/components/schemas/Center'
 *     responses:
 *       200:
 *         description: Center updated successfully
 *       404:
 *         description: Center not found
 */
router.put('/:id', centerController.updateCenter);

/**
 * @swagger
 * /centers/{id}:
 *   delete:
 *     summary: Delete center
 *     tags: [Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Center deleted successfully
 *       404:
 *         description: Center not found
 */
router.delete('/:id', centerController.deleteCenter);

export default router;