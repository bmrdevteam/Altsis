import express from "express";
const router = express.Router();
import * as syllabuses from "../controllers/syllabuses.js";
import { isLoggedIn } from "../middleware/auth.js";

//=================================
//             Syllabus
//=================================

router.post("/", isLoggedIn, syllabuses.create);
router.get("/:_id?", isLoggedIn, syllabuses.find);

router.post("/:_id/confirmed", isLoggedIn, syllabuses.confirm);
router.delete("/:_id/confirmed", isLoggedIn, syllabuses.cancelConfirm);

router.put("/:_id", isLoggedIn, syllabuses.updateV2);
router.put("/:_id/subject", isLoggedIn, syllabuses.updateSubject);

router.put("/:_id/hide", isLoggedIn, syllabuses.hideFromCalendar);
router.put("/:_id/show", isLoggedIn, syllabuses.showOnCalendar);

router.delete("/:_id", isLoggedIn, syllabuses.remove);

export { router };
