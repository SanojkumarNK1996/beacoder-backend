const router = require("express").Router();
const { requireAuth, authorizeAnyRole } = require("../middleware/authorize");
const controller = require("../controllers/contentEditor.controller");

router.use(requireAuth, authorizeAnyRole("admin", "instructor"));
router.get("/courses", controller.getCourses);
router.get("/courses/:courseId/topics", controller.getTopics);
router.get("/courses/:courseId/topics/:topicId/subtopics", controller.getSubtopics);
router.get(
  "/courses/:courseId/topics/:topicId/subtopics/:subtopicId/content",
  controller.getContentBlocks
);
router.patch(
  "/courses/:courseId/topics/:topicId/subtopics/:subtopicId/content/:contentId",
  controller.updateContentBlock
);

module.exports = router;
