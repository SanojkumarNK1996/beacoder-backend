
const router = require('express').Router();

router.use('/auth', require("./auth.routes"));
router.use('/user', require("./user.routes"));
router.use('/admin', require("./admin.routes"));
router.use('/notifications', require("./notification.routes"));
router.use('/courses', require("./course.routes"));
router.use('/content-editor', require("./contentEditor.routes"));
router.use('/curriculum', require("./curriculum.routes"));
router.use('/assignments', require("./assignment.routes"));
router.use('/quizzes', require('./quiz.routes'));
router.use('/questionnaires', require('./questionnaire.routes'));
router.use('/discussions', require('./discussion.routes'));
router.use('/mentors', require('./mentor.routes'));
router.use('/recruiters', require('./recruiter.routes'));
router.use('/progress', require('./progress.routes'));

module.exports = router
