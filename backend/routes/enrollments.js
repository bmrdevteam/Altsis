import express from "express";
const router = express.Router();
import * as enrollments from "../controllers/enrollments.js";
import { isLoggedIn } from "../middleware/auth.js";

//=================================
//             Enrollment
//=================================

router.post("/", isLoggedIn, enrollments.enroll);

// query season&userId -> 유저의 수강 정보 (student 본인 혹은 teacher can access)
// query syllabus -> syllabus 수강하는 학생 목록 (only teacher can access)
router.get("/evaluations", isLoggedIn, enrollments.findEvaluations);

// param _id -> only himself/herself can access
// query season&userId -> 유저의 수강 정보 (-evaluation)
// query syllabus -> syllabus 수강하는 학생 목록 (-evaluation)
router.get("/:_id?", isLoggedIn, enrollments.find);

// 수강 정보에 evaluation 작성 (only teacher can access)
// router.put("/:_id/evaluation", isLoggedIn, enrollments.updateEvaluation);
router.put("/:_id/evaluation2", isLoggedIn, enrollments.updateEvaluation2);

// 수강 정보에 memo 작성 (only student can access)
router.put("/:_id/memo", isLoggedIn, enrollments.updateMemo);

// 수강 정보 캘린더에서 조회/미조회
router.put("/:_id/hide", isLoggedIn, enrollments.hideFromCalendar);
router.put("/:_id/show", isLoggedIn, enrollments.showOnCalendar);

router.delete("/:_id?", isLoggedIn, enrollments.remove);

export { router };
