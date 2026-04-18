const { requireAuth } = require('../middleware/authorize');
const notesController = require('../controllers/notes.controller');

const router = require('express').Router();

/**
 * @swagger
 * /notes:
 *   post:
 *     summary: Create or update a note for a subtopic
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topicId:
 *                 type: integer
 *               subtopicId:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note updated successfully
 *       201:
 *         description: Note created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/', requireAuth, notesController.createOrUpdateNote);

/**
 * @swagger
 * /notes/{topicId}/{subtopicId}:
 *   get:
 *     summary: Get a note for a specific subtopic
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Note fetched successfully
 *       404:
 *         description: Note not found
 *       500:
 *         description: Internal server error
 */
router.get('/:topicId/:subtopicId', requireAuth, notesController.getNote);

/**
 * @swagger
 * /notes/{topicId}:
 *   get:
 *     summary: Get all notes for a topic
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notes fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:topicId', requireAuth, notesController.getNotesByTopic);

module.exports = router;