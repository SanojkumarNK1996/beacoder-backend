const { requireAuth } = require('../middleware/authorize');
const userController = require('../controllers/user.controller');

const router = require('express').Router();

/**
 * @swagger
 * /user:
 *   get:
 *     summary: Test user endpoint
 *     tags: [User]
 *     responses:
 *       200:
 *         description: User fetched successfully
 */
router.get("/", (req, res) => {
    try {
        return res.status(200).json({ msg: "user fetched succesfully" })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})

/**
 * @swagger
 * /user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                 userName:
 *                   type: string
 *                 showMentor:
 *                   type: boolean
 *       500:
 *         description: Internal server error
 */
router.get("/profile", requireAuth, async (req, res) => {
    try {
        const { name } = req.user
        return res.status(200).json({
            msg: "user fetched succesfully",
            userName: name,
            showMentor: req.user.showMentor === true,
        })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})

/**
 * @swagger
 * /user/my-courses:
 *   get:
 *     summary: Get user's enrolled courses
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Courses fetched successfully
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
 *                     properties:
 *                       isActive:
 *                         type: boolean
 *                         description: Whether the enrolled course is currently available
 *       500:
 *         description: Internal server error
 */
router.get('/my-courses',requireAuth, userController.getUserCourses);

/**
 * @swagger
 * /user/subtopics/{subtopicId}/review:
 *   get:
 *     summary: Get the current user's subtopic review selection
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Current selection and course review coverage
 *       403:
 *         description: User not enrolled in course
 *       404:
 *         description: Subtopic not found
 *       500:
 *         description: Internal server error
 */
router.get('/subtopics/:subtopicId/review', requireAuth, userController.getSubtopicReview);

/**
 * @swagger
 * /user/subtopics/{subtopicId}/review:
 *   post:
 *     summary: Save the current user's subtopic review selection
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [selection]
 *             properties:
 *               selection:
 *                 type: string
 *                 enum: [UNDERSTOOD, NEEDS_MORE, NOT_GOOD]
 *     responses:
 *       200:
 *         description: Saved selection and updated course review coverage
 *       400:
 *         description: Invalid selection or subtopic ID
 *       403:
 *         description: User is not enrolled or subtopic is unavailable
 *       404:
 *         description: Subtopic not found
 */
router.post('/subtopics/:subtopicId/review', requireAuth, userController.saveSubtopicReview);

/**
 * @swagger
 * /user/{courseId}/enroll:
 *   post:
 *     summary: Enroll in a course
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Enrolled successfully
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
 *         description: Already enrolled
 *       403:
 *         description: Course is inactive and cannot be enrolled in
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.post('/:courseId/enroll',requireAuth, userController.enrollInCourse);



module.exports = router
