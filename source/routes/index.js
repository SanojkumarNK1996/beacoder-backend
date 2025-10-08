const router = require('express').Router();

router.use('/auth', require("./auth.routes"));
router.use('/user', require("./user.routes"));
router.use('/admin', require("./admin.routes"));
router.use('/courses', require("./course.routes"));

module.exports = router