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
 *       500:
 *         description: Internal server error
 */
router.get("/profile", requireAuth, async (req, res) => {
    try {
        const { name } = req.user
        return res.status(200).json({ msg: "user fetched succesfully", userName: name })
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
 *       500:
 *         description: Internal server error
 */
router.get('/my-courses',requireAuth, userController.getUserCourses);

/**
 * @swagger
 * /user/badges:
 *   get:
 *     summary: Get user's badges
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Badges fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 badges:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 */
router.get('/badges', requireAuth, userController.getUserBadges);

/**
 * @swagger
 * /user/content/{contentBlockId}/complete:
 *   post:
 *     summary: Mark content block as completed
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentBlockId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content marked as completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 completionPercentage:
 *                   type: number
 *                 newAssignmentUnlocked:
 *                   type: boolean
 *       403:
 *         description: User not enrolled in course
 *       404:
 *         description: Content not found
 *       500:
 *         description: Internal server error
 */
router.post('/content/:contentBlockId/complete',requireAuth,userController.markContentCompleted);

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
 *       500:
 *         description: Internal server error
 */
router.post('/:courseId/enroll',requireAuth, userController.enrollInCourse);



module.exports = router
