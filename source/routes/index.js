
const router = require('express').Router();

router.use('/auth', require("./auth.routes"));
router.use('/user', require("./user.routes"));
router.use('/admin', require("./admin.routes"));
router.use('/notifications', require("./notification.routes"));
router.use('/courses', require("./course.routes"));
router.use('/assignments', require("./assignment.routes"));
router.use('/courses/:courseId', require("./quiz.routes"));
router.use('/discussions', require('./discussion.routes'));

module.exports = router
