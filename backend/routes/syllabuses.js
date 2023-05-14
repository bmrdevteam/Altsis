import express from "express";
const router = express.Router();
import * as syllabuses from "../controllers/syllabuses.js";
import { isLoggedIn } from "../middleware/auth.js";

//=================================
//             Syllabus
//=================================

router.post("/", isLoggedIn, syllabuses.create);
router.get("/:_id?", isLoggedIn, syllabuses.find);

router.put("/:_id/confirmed", isLoggedIn, syllabuses.confirm);
router.delete("/:_id/confirmed", isLoggedIn, syllabuses.unconfirm);

router.put("/:_id", isLoggedIn, syllabuses.updateV2);
router.put("/:_id/subject", isLoggedIn, syllabuses.updateSubject);

router.delete("/:_id", isLoggedIn, syllabuses.remove);

export { router };
