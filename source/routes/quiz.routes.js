const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const { requireAuth, authorizeAnyRole } = require('../middleware/authorize');

router.get('/courses', requireAuth, quizController.getCourseCatalog);
router.post('/start', requireAuth, quizController.startQuiz);
router.post('/submit', requireAuth, quizController.submitQuiz);
router.get('/subtopic/:subtopicKey', requireAuth, quizController.getQuestions);
router.get(
  '/subtopic/:subtopicKey/authoring',
  requireAuth,
  authorizeAnyRole('admin', 'instructor'),
  quizController.getAuthoringQuestions,
);

module.exports = router;
