const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const topicController = require("../controllers/topic.controller")
const subTopicController = require("../controllers/subtopics.controller")
const contentBlockController = require("../controllers/contentBlock.controller");
const { requireAuth } = require("../middleware/authorize")

//courses ------------
router.post('/', courseController.createCourse);

// Update a course
router.patch('/:courseId', courseController.updateCourse);

// List all courses
router.get('/', courseController.getAllCourses);

// get Single courses
router.get('/:courseId', courseController.getCourseById);

// Delete a course
router.delete('/:courseId', courseController.deleteCourse);

//topics ---------------
//single topic upload
router.post('/:courseId/topics', topicController.createTopic);

//bulk topic upload
router.post('/:courseId/topics/bulk', topicController.bulkCreateTopics);

// Update a topic
router.patch('/:courseId/topics/:topicId', topicController.updateTopic);

//Get all topics of a course
router.get('/:courseId/topics', topicController.getTopics);

//Get a single topic
router.get('/:courseId/topics/:topicId', topicController.getTopicById);

//Delete a topic
router.delete('/:courseId/topics/:topicId', topicController.deleteTopic);

// subtopics ---------------
//single subtopic upload
router.post('/:courseId/topics/:topicId/subtopics', subTopicController.createSubtopic);

//bulk subtopic upload
router.post('/:courseId/topics/:topicId/subtopics/bulk', subTopicController.bulkCreateSubtopics);

// Update a subtopic
router.patch('/:courseId/topics/:topicId/subtopics/:subtopicId', subTopicController.updateSubtopic);

//Get all subTopics of a topic
router.get('/:courseId/topics/:topicId/subtopics', subTopicController.getSubtopics);

//Get a single subTopic by topicId
router.get('/:courseId/topics/:topicId/subtopics/:subtopicId', subTopicController.getSubtopicById);

//Delete a subtopic
router.delete('/:courseId/topics/:topicId/subtopics/:subtopicId', subTopicController.deleteSubtopic);


// Content
router.post("/:courseId/topics/:topicId/subtopics/:subtopicId/contents", contentBlockController.createContentBlock);

router.get("/:courseId/topics/:topicId/subtopics/:subtopicId/contents", contentBlockController.getContentBlocksBySubtopic);

// router.get("/:id", contentBlockController.getContentBlockById);

router.patch("/:courseId/topics/:topicId/subtopics/:subtopicId/contents/:contentId", contentBlockController.updateContentBlock);

router.delete("/:courseId/topics/:topicId/subtopics/:subtopicId/contents/:contentId", contentBlockController.deleteContentBlock);

module.exports = router;