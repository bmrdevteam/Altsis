const express = require("express");
const router = express.Router();
const enrollments = require("../controllers/enrollments");
const { isAdmin, isLoggedIn, isAdManager } = require("../middleware/auth");

//=================================
//             Enrollment
//=================================

router.post("/", isLoggedIn, enrollments.enroll);
router.post("/bulk", isAdManager, enrollments.enrollbulk);

// query season&userId -> 유저의 수강 정보 (student 본인 혹은 teacher can access)
// query syllabus -> syllabus 수강하는 학생 목록 (only teacher can access)
router.get("/evaluations", isLoggedIn, enrollments.findEvaluations);

// 수강 정보에 evaluation 작성 (only teacher can access)
router.put("/:_id/evaluation", isLoggedIn, enrollments.updateEvaluation);

// param _id -> only himself/herself can access
// query season&userId -> 유저의 수강 정보 (-evaluation)
// query syllabus -> syllabus 수강하는 학생 목록 (-evaluation)
router.get("/:_id?", isLoggedIn, enrollments.find);

router.delete("/:_id?", isLoggedIn, enrollments.remove);

module.exports = router;
