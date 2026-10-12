const router = require("express").Router();
const { requireAuth } = require("../middleware/authorize");
const mentorController = require("../controllers/mentor.controller");

router.get("/", requireAuth, mentorController.getActiveMentors);

module.exports = router;
