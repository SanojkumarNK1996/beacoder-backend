const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const { requireAuth, authorize } = require('../middleware/authorize');

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Create a new assignment
 *     tags: [Assignments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - submissionType
 *               - maxMarks
 *               - courseId
 *               - topicId
 *               - subtopicId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: object
 *               submissionType:
 *                 type: string
 *                 enum: [TEXT, URL, BOTH]
 *               allowedUrlType:
 *                 type: string
 *                 enum: [GITHUB, DRIVE, ANY]
 *               maxMarks:
 *                 type: number
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               courseId:
 *                 type: integer
 *               topicId:
 *                 type: integer
 *               subtopicId:
 *                 type: integer
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post('/', assignmentController.createAssignment);

// Get assignments 
/**
 * @swagger
 * /assignments/my-assignments:
 *   get:
 *     summary: Get user's assignments
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignments fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 assignments:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
router.get('/my-assignments', requireAuth, assignmentController.getMyAssignments);

// Homepage assignment stats for logged-in user
/**
 * @swagger
 * /assignments/my-assignments/stats:
 *   get:
 *     summary: Get user's assignment stats
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     submittedCount:
 *                       type: integer
 *                     pendingCount:
 *                       type: integer
 *                     earnedBadges:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/my-assignments/stats', requireAuth, assignmentController.getMyAssignmentStats);

// Admin: list all submitted assignment submissions with pagination
/**
 * @swagger
 * /assignments/admin/submitted:
 *   get:
 *     summary: Get submitted assignments (Admin)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pageNo
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed]
 *     responses:
 *       200:
 *         description: Submissions fetched successfully
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get('/admin/submitted', requireAuth, assignmentController.getSubmittedAssignments);

// Admin: get single assignment submission details
/**
 * @swagger
 * /assignments/admin/submitted/{submissionId}:
 *   get:
 *     summary: Get assignment submission details (Admin)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Submission details fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/admin/submitted/:submissionId', requireAuth, assignmentController.getAssignmentSubmissionDetails);

// Admin: update assignment submission status
/**
 * @swagger
 * /assignments/admin/submitted/{submissionId}:
 *   post:
 *     summary: Update assignment submission status (Admin)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
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
 *                 enum: [accepted, rejected]
 *               feedback:
 *                 type: string
 *               marks:
 *                 type: number
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post('/admin/submitted/:submissionId', requireAuth, assignmentController.updateAssignmentStatus);

// Submit assignment
/**
 * @swagger
 * /assignments/{assignmentId}/submit:
 *   post:
 *     summary: Submit an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               textAnswer:
 *                 type: string
 *               submissionUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assignment submitted successfully
 *       400:
 *         description: Invalid submission
 *       403:
 *         description: Assignment not unlocked
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Internal server error
 */
router.post('/:assignmentId/submit', requireAuth, assignmentController.submitAssignment);

module.exports = router;