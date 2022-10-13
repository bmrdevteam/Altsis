const express = require("express");
const router = express.Router();
const enrollment = require("../controllers/enrollment");
const { isAdmin, isLoggedIn, isAdManager } = require("../middleware/auth");

//=================================
//             Enrollment
//=================================

router.post("/", isLoggedIn, enrollment.enroll);
router.post("/bulk", isAdManager, enrollment.enrollbulk);

router.get("/students", isLoggedIn, enrollment.findStudents);

router.get("/evaluations", isLoggedIn, enrollment.findStudentsWithEvaluation);

router.put("/:_id/evaluation", isLoggedIn, enrollment.updateEvaluation);
router.get("/:_id?", isLoggedIn, enrollment.find);

router.delete("/:_id", isLoggedIn, enrollment.remove);

module.exports = router;
