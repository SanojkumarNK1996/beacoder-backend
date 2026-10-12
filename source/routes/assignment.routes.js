const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const { requireAuth, authorizeAnyRole } = require('../middleware/authorize');

const assignmentEditors = [requireAuth, authorizeAnyRole('admin', 'instructor')];
const assignmentReviewers = [requireAuth, authorizeAnyRole('admin', 'instructor')];

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Create a catalogue assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, difficulty, description, subtopicKey]
 *             properties:
 *               title: { type: string }
 *               difficulty: { type: string, enum: [easy, medium, tough] }
 *               description:
 *                 type: object
 *                 required: [task, learningBenefits, context, expectedOutput]
 *                 properties:
 *                   task: { type: string }
 *                   learningBenefits: { type: string }
 *                   context: { type: string }
 *                   expectedOutput: { type: string }
 *               subtopicKey: { type: string }
 *               displayOrder: { type: integer }
 *     responses:
 *       201:
 *         description: Assignment created
 *       400:
 *         description: Invalid assignment
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or instructor role required for catalogue, allocation, and submission review
 * /assignments/{assignmentId}:
 *   put:
 *     summary: Update a catalogue assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               difficulty: { type: string, enum: [easy, medium, tough] }
 *               description:
 *                 type: object
 *                 required: [task, learningBenefits, context, expectedOutput]
 *                 properties:
 *                   task: { type: string }
 *                   learningBenefits: { type: string }
 *                   context: { type: string }
 *                   expectedOutput: { type: string }
 *               displayOrder: { type: integer }
 *     responses:
 *       200:
 *         description: Assignment updated
 *       400:
 *         description: Invalid assignment update
 *       404:
 *         description: Assignment not found
 * /assignments/available:
 *   get:
 *     summary: List assignments in a validated course hierarchy
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: topicId
 *         schema: { type: integer }
 *       - in: query
 *         name: subtopicKey
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Matching active catalogue assignments
 *       400:
 *         description: Invalid hierarchy
 * /assignments/eligible-users:
 *   get:
 *     summary: List active students enrolled in a course
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eligible students
 * /assignments/assign:
 *   post:
 *     summary: Allocate assignments to eligible students
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [courseId, subtopicKey, assignmentIds, userIds]
 *             properties:
 *               courseId: { type: integer }
 *               topicId: { type: integer, description: Optional; used to validate the subtopic hierarchy }
 *               subtopicKey: { type: string }
 *               assignmentIds:
 *                 type: array
 *                 items: { type: integer }
 *               userIds:
 *                 type: array
 *                 items: { type: integer }
 *     responses:
 *       201:
 *         description: Allocation counts
 *       400:
 *         description: Invalid hierarchy, assignment, or ID
 * /assignments/my-assignments:
 *   get:
 *     summary: List the current user's assigned work
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [assigned, in_progress, submitted, completed, rejected] }
 *     responses:
 *       200:
 *         description: User assignments with assignment and course details
 * /assignments/my-assignments/stats:
 *   get:
 *     summary: Get the current user's assignment counts
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending and submitted counts
 * /assignments/user/{userAssignmentId}/start:
 *   post:
 *     summary: Start an assigned task
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userAssignmentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Assignment started
 *       403:
 *         description: Assignment belongs to another user
 * /assignments/{userAssignmentId}/submit:
 *   post:
 *     summary: Submit or resubmit assigned work
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userAssignmentId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [submissionUrl]
 *             properties:
 *               submissionUrl: { type: string, format: uri }
 *     responses:
 *       200:
 *         description: Submission recorded
 *       400:
 *         description: Invalid submission or already completed
 *       403:
 *         description: Assignment belongs to another user
 * /assignments/admin/submitted:
 *   get:
 *     summary: List submitted and completed assignments for review
 *     tags: [Assignments]
 *     description: Admin or instructor review endpoint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pageNo
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: courseId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [all, pending, reviewed, submitted, completed] }
 *     responses:
 *       200:
 *         description: Paginated submissions and review counts
 * /assignments/admin/submitted/{submissionId}:
 *   get:
 *     summary: Get submitted assignment details
 *     tags: [Assignments]
 *     description: Admin or instructor review endpoint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Submission with assignment, course, and user
 *       404:
 *         description: Submitted assignment not found
 *   post:
 *     summary: Complete or reject a submitted assignment review
 *     tags: [Assignments]
 *     description: Admin or instructor review endpoint
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [completed, rejected] }
 *               marksObtained: { type: number, minimum: 0, description: Required when status is completed; omit when rejected }
 *               feedback: { type: string, description: Required and non-empty when status is rejected }
 *     responses:
 *       200:
 *         description: Review completed
 *       400:
 *         description: Invalid review fields, missing rejection comment, or assignment state
 *       404:
 *         description: Assignment not found
 */
router.get('/available', ...assignmentEditors, assignmentController.getAvailableAssignments);
router.get('/eligible-users', ...assignmentEditors, assignmentController.getEligibleUsers);
router.post('/assign', ...assignmentEditors, assignmentController.assignAssignments);
router.put('/:assignmentId', ...assignmentEditors, assignmentController.updateAssignment);

router.get('/my-assignments', requireAuth, assignmentController.getMyAssignments);
router.get('/my-assignments/stats', requireAuth, assignmentController.getMyAssignmentStats);

router.get('/admin/submitted', ...assignmentReviewers, assignmentController.getSubmittedAssignments);
router.get('/admin/submitted/:submissionId', ...assignmentReviewers, assignmentController.getAssignmentSubmissionDetails);
router.post('/admin/submitted/:submissionId', ...assignmentReviewers, assignmentController.updateAssignmentStatus);

router.post('/user/:userAssignmentId/start', requireAuth, assignmentController.startAssignment);
router.post('/:userAssignmentId/submit', requireAuth, assignmentController.submitAssignment);
router.post('/', ...assignmentEditors, assignmentController.createAssignment);

module.exports = router;
