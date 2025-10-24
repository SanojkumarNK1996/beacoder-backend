const express = require('express');
const router = express.Router({ mergeParams: true });
const quizController = require('../controllers/quiz.controller');
const { requireAuth } = require('../middleware/authorize');


// ADMIN (topic level quiz)
router.post('/topics/:topicId/quiz', quizController.createTopicQuiz);
router.patch('/topics/:topicId/quiz/:quizId', quizController.updateQuiz);
router.delete('/topics/:topicId/quiz/:quizId', quizController.deleteQuiz);
router.get('/topics/:topicId/quiz/submissions', quizController.getTopicQuizSubmissions);


//  STUDENT → Topic-level
router.get('/topics/:topicId/quiz', quizController.getQuizzesByTopic);
router.post('/topics/:topicId/quiz/:quizId/submit', requireAuth, quizController.submitTopicQuiz);

// single quiz result
router.get('/topics/:topicId/quiz/:quizId/result', requireAuth, quizController.getSingleQuizResultForTopic);

// topic wise quiz result(one topic can have multiple quiz sessions)
router.get('/topics/:topicId/quiz-performance', requireAuth, quizController.getTopicQuizPerformance);

// course quiz result
router.get('/quiz/quiz-results', requireAuth, quizController.getUserQuizResults);



module.exports = router;