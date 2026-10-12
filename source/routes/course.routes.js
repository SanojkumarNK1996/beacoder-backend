const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const topicController = require("../controllers/topic.controller")
const subTopicController = require("../controllers/subtopics.controller")
const contentBlockController = require("../controllers/contentBlock.controller");
const { requireAuth, authorizeAnyRole } = require("../middleware/authorize")
const contentEditorAccess = [requireAuth, authorizeAnyRole("admin", "instructor")];

//courses ------------
/**
 * @swagger
 * /courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Course created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/', courseController.createCourse);

/**
 * @swagger
 * /courses/{courseId}:
 *   patch:
 *     summary: Update a course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       500:
 *         description: Internal server error
 */
router.patch('/:courseId', courseController.updateCourse);

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All non-enrolled courses, including inactive courses for locked-course display
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
 *                         description: False when the course is unavailable for enrollment
 *       500:
 *         description: Internal server error
 */
router.get('/', requireAuth, courseController.getAllCourses);

/**
 * @swagger
 * /courses/{courseId}:
 *   get:
 *     summary: Get a single course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course fetched successfully, including its isActive state
 *       500:
 *         description: Internal server error
 */
router.get('/:courseId', courseController.getCourseById);

/**
 * @swagger
 * /courses/{courseId}:
 *   delete:
 *     summary: Delete a course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/:courseId', courseController.deleteCourse);

//topics ---------------
/**
 * @swagger
 * /courses/{courseId}/topics:
 *   post:
 *     summary: Create a topic
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Topic created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/:courseId/topics', topicController.createTopic);

/**
 * @swagger
 * /courses/{courseId}/topics/bulk:
 *   post:
 *     summary: Bulk create topics
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Topics created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/:courseId/topics/bulk', topicController.bulkCreateTopics);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}:
 *   patch:
 *     summary: Update a topic
 *     tags: [Topics]
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
 *     responses:
 *       200:
 *         description: Topic updated successfully
 *       500:
 *         description: Internal server error
 */
router.patch('/:courseId/topics/:topicId', topicController.updateTopic);

/**
 * @swagger
 * /courses/{courseId}/topics:
 *   get:
 *     summary: Get all topics of a course
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Topics fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:courseId/topics', topicController.getTopics);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}:
 *   get:
 *     summary: Get a single topic
 *     tags: [Topics]
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
 *         description: Topic fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:courseId/topics/:topicId', topicController.getTopicById);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}:
 *   delete:
 *     summary: Delete a topic
 *     tags: [Topics]
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
 *         description: Topic deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/:courseId/topics/:topicId', topicController.deleteTopic);

// subtopics ---------------
/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/subtopics:
 *   post:
 *     summary: Create a subtopic
 *     tags: [Subtopics]
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
 *     responses:
 *       200:
 *         description: Subtopic created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/:courseId/topics/:topicId/subtopics', subTopicController.createSubtopic);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/subtopics/bulk:
 *   post:
 *     summary: Bulk create subtopics
 *     tags: [Subtopics]
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
 *     responses:
 *       200:
 *         description: Subtopics created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/:courseId/topics/:topicId/subtopics/bulk', subTopicController.bulkCreateSubtopics);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/subtopics/{subtopicId}:
 *   patch:
 *     summary: Update a subtopic
 *     tags: [Subtopics]
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
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Subtopic updated successfully
 *       500:
 *         description: Internal server error
 */
router.patch('/:courseId/topics/:topicId/subtopics/:subtopicId', subTopicController.updateSubtopic);

//Get all subTopics of a topic
/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/subtopics:
 *   get:
 *     summary: Get all subtopics of a topic
 *     tags: [Subtopics]
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
 *         description: Subtopics fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:courseId/topics/:topicId/subtopics', subTopicController.getSubtopics);

//Get a single subTopic by topicId
/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/subtopics/{subtopicId}:
 *   get:
 *     summary: Get a single subtopic
 *     tags: [Subtopics]
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
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subtopic fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/:courseId/topics/:topicId/subtopics/:subtopicId', subTopicController.getSubtopicById);

//Delete a subtopic
/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/subtopics/{subtopicId}:
 *   delete:
 *     summary: Delete a subtopic
 *     tags: [Subtopics]
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
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subtopic deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete('/:courseId/topics/:topicId/subtopics/:subtopicId', subTopicController.deleteSubtopic);


// Content
/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/subtopics/{subtopicId}/contents:
 *   post:
 *     summary: Create a content block
 *     tags: [Content]
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
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Content block created successfully
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:courseId/topics/:topicId/subtopics/:subtopicId/contents",
  ...contentEditorAccess,
  contentBlockController.createContentBlock
);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/subtopics/{subtopicId}/contents:
 *   get:
 *     summary: Get content blocks by subtopic
 *     tags: [Content]
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
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content blocks fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get("/:courseId/topics/:topicId/subtopics/:subtopicId/contents", contentBlockController.getContentBlocksBySubtopic);

// router.get("/:id", contentBlockController.getContentBlockById);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/subtopics/{subtopicId}/contents/{contentId}:
 *   patch:
 *     summary: Update a content block
 *     tags: [Content]
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
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Content block updated successfully
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/:courseId/topics/:topicId/subtopics/:subtopicId/contents/:contentId",
  ...contentEditorAccess,
  contentBlockController.updateContentBlock
);

/**
 * @swagger
 * /courses/{courseId}/topics/{topicId}/subtopics/{subtopicId}/contents/{contentId}:
 *   delete:
 *     summary: Delete a content block
 *     tags: [Content]
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
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content block deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:courseId/topics/:topicId/subtopics/:subtopicId/contents/:contentId",
  ...contentEditorAccess,
  contentBlockController.deleteContentBlock
);

module.exports = router;