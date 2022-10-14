const express = require("express");
const router = express.Router();
const enrollment = require("../controllers/enrollment");
const { isAdmin, isLoggedIn, isAdManager } = require("../middleware/auth");

//=================================
//             Enrollment
//=================================

router.post("/", isLoggedIn, enrollment.enroll);
router.post("/bulk", isAdManager, enrollment.enrollbulk);

// query season&userId -> 유저의 수강 정보 (student 본인 혹은 teacher can access)
// query syllabus -> syllabus 수강하는 학생 목록 (only teacher can access)
router.get("/evaluations", isLoggedIn, enrollment.findEvaluations);

// 수강 정보에 evaluation 작성 (only teacher can access)
router.put("/:_id/evaluation", isLoggedIn, enrollment.updateEvaluation);

// param _id -> only himself/herself can access
// query season&userId -> 유저의 수강 정보 (-evaluation)
// query syllabus -> syllabus 수강하는 학생 목록 (-evaluation)
router.get("/:_id?", isLoggedIn, enrollment.find);

router.delete("/:_id", isLoggedIn, enrollment.remove);

module.exports = router;
