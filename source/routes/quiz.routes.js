const express = require('express');
const router = express.Router({ mergeParams: true });
const quizController = require('../controllers/quiz.controller');
const { requireAuth } = require('../middleware/authorize');


// ADMIN (topic level quiz)
/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/quiz:
 *   post:
 *     summary: Create a topic-level quiz (Admin)
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: topicId
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
 *               - questionData
 *               - title
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               questionData:
 *                 type: array
 *                 items:
 *                   type: object
 *               title:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Quiz created successfully
 *       404:
 *         description: Topic not found
 *       500:
 *         description: Internal server error
 */
router.post('/topics/:topicId/quiz', quizController.createTopicQuiz);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/quiz/{quizId}:
 *   patch:
 *     summary: Update a quiz (Admin)
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: quizId
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
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               questionData:
 *                 type: array
 *                 items:
 *                   type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
router.patch('/topics/:topicId/quiz/:quizId', quizController.updateQuiz);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/quiz/{quizId}:
 *   delete:
 *     summary: Delete a quiz (Admin)
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/topics/:topicId/quiz/:quizId', quizController.deleteQuiz);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/quiz/submissions:
 *   get:
 *     summary: Get topic quiz submissions (Admin)
 *     tags: [Quizzes]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Submissions fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/topics/:topicId/quiz/submissions', quizController.getTopicQuizSubmissions);


//  STUDENT → Topic-level
/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/quiz:
 *   get:
 *     summary: Get quizzes by topic
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quizzes fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/topics/:topicId/quiz', quizController.getQuizzesByTopic);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/quiz/{quizId}/submit:
 *   post:
 *     summary: Submit a topic quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: quizId
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
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Quiz submitted successfully
 *       400:
 *         description: Invalid answers
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Internal server error
 */
router.post('/topics/:topicId/quiz/:quizId/submit', requireAuth, quizController.submitTopicQuiz);

// single quiz result
/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/quiz/{quizId}/result:
 *   get:
 *     summary: Get single quiz result
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz result fetched successfully
 *       404:
 *         description: No result found
 *       500:
 *         description: Internal server error
 */
router.get('/topics/:topicId/quiz/:quizId/result', requireAuth, quizController.getSingleQuizResultForTopic);

// topic wise quiz result(one topic can have multiple quiz sessions)
/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/quiz-performance:
 *   get:
 *     summary: Get topic quiz performance
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Performance fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/topics/:topicId/quiz-performance', requireAuth, quizController.getTopicQuizPerformance);

// course quiz result
/**
 * @swagger
 * /courses/{courseId}/quiz/quiz-results:
 *   get:
 *     summary: Get user quiz results
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz results fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/quiz/quiz-results', requireAuth, quizController.getUserQuizResults);



module.exports = router;