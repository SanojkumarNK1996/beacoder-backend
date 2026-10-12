const router = require("express").Router();
const controller = require("../controllers/recruiter.controller");
const { requireAuth, authorizeAnyRole } = require("../middleware/authorize");

router.use(requireAuth, authorizeAnyRole("student", "admin"));
router.get("/", controller.list);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
