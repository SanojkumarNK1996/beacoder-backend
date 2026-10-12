const router = require('express').Router();
const { requireAuth, authorizeAnyRole } = require('../middleware/authorize');
const progressController = require('../controllers/progress.controller');

router.get('/', requireAuth, progressController.getStudentProgress);
router.get('/activities', requireAuth, authorizeAnyRole('student'), progressController.getMyStudentActivities);
router.get('/manage', requireAuth, authorizeAnyRole('admin', 'instructor'), progressController.getManagedProgress);
router.get('/manage/:studentId/activities', requireAuth, authorizeAnyRole('admin', 'instructor'), progressController.getStudentActivities);
router.post('/manage/:studentId/activities', requireAuth, authorizeAnyRole('admin', 'instructor'), progressController.createStudentActivity);
router.put('/manage/:studentId', requireAuth, authorizeAnyRole('admin', 'instructor'), progressController.saveManagedProgress);

module.exports = router;
