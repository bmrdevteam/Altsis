const express = require("express");
const router = express.Router();
const syllabus = require("../controllers/syllabus");
const { isAdmin, isLoggedIn } = require("../middleware/auth");

//=================================
//             Syllabus
//=================================

router.post("/", isLoggedIn, syllabus.create);
router.get("/:_id?", isLoggedIn, syllabus.find);

//router.get("/time", isLoggedIn, syllabus.time); //내가 수강하는 것
// router.get("/:_id/students", isLoggedIn, syllabus.students); // 이 syllabus를 듣는 학생들
// 이건 enrollments에 들어가야 함

router.put("/:_id/confirmed", isLoggedIn, syllabus.confirm);
router.delete("/:_id/confirmed", isLoggedIn, syllabus.unconfirm);

router.put("/:_id/time", isLoggedIn, syllabus.updateTime);
router.put("/:_id/classroom", isLoggedIn, syllabus.updateClassroom);
router.put("/:_id/:field?", isLoggedIn, syllabus.update);

router.delete("/:_id", isLoggedIn, syllabus.remove);

module.exports = router;
