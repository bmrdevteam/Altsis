import express from "express";
const router = express.Router();
import * as enrollments from "../controllers/enrollments.js";
import { isLoggedIn } from "../middleware/auth.js";

//=================================
//             Enrollment
//=================================

router.post("/", isLoggedIn, enrollments.enroll);

router.get("/evaluation", isLoggedIn, enrollments.findEvaluations);
router.get("/:_id?", isLoggedIn, enrollments.find);

router.put("/:_id/evaluation", isLoggedIn, enrollments.updateEvaluation);

// 수강 정보에 memo 작성 (only student can access)
router.put("/:_id/memo", isLoggedIn, enrollments.updateMemo);

// 수강 정보 캘린더에서 조회/미조회
router.put("/:_id/hide", isLoggedIn, enrollments.hideFromCalendar);
router.put("/:_id/show", isLoggedIn, enrollments.showOnCalendar);

router.delete("/:_id?", isLoggedIn, enrollments.remove);

export { router };
