const router = require('express').Router();
const adminController = require('../controllers/admin.controller.js');
const { authorize, requireAuth } = require("../middleware/authorize")


router.post('/create', requireAuth, authorize("admin"), adminController.createAdmin);
router.post('/confirm-payment', requireAuth, authorize("admin"), adminController.conformPayment);

module.exports = router;