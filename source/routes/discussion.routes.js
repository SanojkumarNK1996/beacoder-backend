const router = require('express').Router();
const { requireAuth, authorize } = require('../middleware/authorize');
const discussionController = require('../controllers/discussion.controller');

// Student APIs
/**
 * @swagger
 * /discussions:
 *   post:
 *     summary: Create a discussion
 *     tags: [Discussions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               courseId:
 *                 type: integer
 *               assignmentId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Discussion created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Not enrolled in course
 *       500:
 *         description: Internal server error
 */
router.post('/', requireAuth, discussionController.createDiscussion);

/**
 * @swagger
 * /discussions:
 *   get:
 *     summary: Get student discussions
 *     tags: [Discussions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [all, me]
 *           default: all
 *     responses:
 *       200:
 *         description: Discussions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
router.get('/', requireAuth, discussionController.getStudentDiscussions);

// Admin APIs
/**
 * @swagger
 * /discussions/admin:
 *   get:
 *     summary: Get admin discussions
 *     tags: [Discussions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Discussions fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/admin', requireAuth, discussionController.getAdminDiscussions);

/**
 * @swagger
 * /discussions/admin/pair-programming:
 *   get:
 *     summary: Get admin pair programming discussions
 *     tags: [Discussions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, completed]
 *     responses:
 *       200:
 *         description: Pair programming discussions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid courseId or status
 *       500:
 *         description: Internal server error
 */
router.get('/admin/pair-programming', requireAuth, discussionController.getAdminPairProgrammingDiscussions);

/**
 * @swagger
 * /discussions/admin/{id}:
 *   get:
 *     summary: Get admin discussion by ID
 *     tags: [Discussions]
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
 *         description: Discussion fetched successfully
 *       400:
 *         description: Invalid ID
 *       500:
 *         description: Internal server error
 */
router.get('/admin/:id', requireAuth, discussionController.getAdminDiscussionById);

/**
 * @swagger
 * /discussions/admin/{id}:
 *   patch:
 *     summary: Update discussion status (Admin)
 *     tags: [Discussions]
 *     security:
 *       - bearerAuth: []
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, closed]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.patch('/admin/:id', requireAuth, discussionController.updateDiscussionStatus);

/**
 * @swagger
 * /discussions/admin/{id}/replies:
 *   post:
 *     summary: Create an admin discussion reply
 *     tags: [Discussions]
 *     security:
 *       - bearerAuth: []
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
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reply created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post('/admin/:id/replies', requireAuth, discussionController.createAdminDiscussionReply);

/**
 * @swagger
 * /discussions/admin/{id}/pair-programming-status:
 *   patch:
 *     summary: Update pair programming status (Admin)
 *     tags: [Discussions]
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
 *         description: Pair programming status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid discussion ID
 *       404:
 *         description: Discussion not found
 *       500:
 *         description: Internal server error
 */
router.patch('/admin/:id/pair-programming-status', requireAuth, discussionController.updatePairProgrammingStatus);

// Student single and reply creation
/**
 * @swagger
 * /discussions/{id}:
 *   get:
 *     summary: Get student discussion by ID
 *     tags: [Discussions]
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
 *         description: Discussion fetched successfully
 *       400:
 *         description: Invalid ID
 *       500:
 *         description: Internal server error
 */
router.get('/:id', requireAuth, discussionController.getStudentDiscussionById);

/**
 * @swagger
 * /discussions/{id}/replies:
 *   post:
 *     summary: Create a discussion reply
 *     tags: [Discussions]
 *     security:
 *       - bearerAuth: []
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
 *             required:
 *               - reply
 *             properties:
 *               reply:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reply created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post('/:id/replies', requireAuth, discussionController.createDiscussionReply);

/**
 * @swagger
 * /discussions/pair-programming:
 *   post:
 *     summary: Update discussion with pair programming request
 *     tags: [Discussions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - discussionId
 *               - bookedSlot
 *             properties:
 *               discussionId:
 *                 type: integer
 *               bookedSlot:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Pair programming request updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Only the discussion creator can raise a pair programming request
 *       404:
 *         description: Discussion not found
 *       500:
 *         description: Internal server error
 */
router.post('/pair-programming/:discussionId', requireAuth, discussionController.updatePairProgrammingRequest);

module.exports = router;
