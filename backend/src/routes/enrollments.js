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

router.put("/:_id/memo", isLoggedIn, enrollments.updateMemo);

router.put("/:_id/hide", isLoggedIn, enrollments.hideFromCalendar);
router.put("/:_id/show", isLoggedIn, enrollments.showOnCalendar);

router.delete("/:_id", isLoggedIn, enrollments.remove);

export { router };
