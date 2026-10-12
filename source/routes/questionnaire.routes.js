const router = require('express').Router();
const controller = require('../controllers/questionnaire.controller');
const { requireAuth, authorizeAnyRole } = require('../middleware/authorize');

const mentors = [requireAuth, authorizeAnyRole('instructor', 'admin')];
const students = [requireAuth, authorizeAnyRole('student', 'admin')];

router.get('/mine', ...mentors, controller.listTests);
router.post('/', ...mentors, controller.createTest);
router.put('/:testId', ...mentors, controller.updateTest);
router.post('/:testId/assign', ...mentors, controller.assignTest);
router.post('/:testId/retake/:userId', ...mentors, controller.allowRetake);
router.get('/students', ...mentors, controller.searchStudents);
router.get('/results', ...mentors, controller.searchResults);
router.get('/:testId/preview', ...mentors, controller.mentorTestPreview);
router.get('/assigned', ...students, controller.listMyTests);
router.get('/:testId/start', ...students, controller.startTest);
router.post('/:testId/submit', ...students, controller.submitTest);

module.exports = router;
