const router = require('express').Router();
const controller = require('../controllers/curriculum.controller');
const { requireAuth } = require('../middleware/authorize');

router.get('/', requireAuth, controller.getCurriculum);
router.get('/search', requireAuth, controller.searchCurriculum);
router.get('/roadmap', requireAuth, controller.getRoadmap);
router.get('/streams/:stream', requireAuth, controller.getStream);

module.exports = router;
