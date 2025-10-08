const router = require('express').Router();
const authController = require('../controllers/auth.controller.js');


router.post('/signup',authController.SignUp);
router.post('/login',authController.Login);

module.exports = router;