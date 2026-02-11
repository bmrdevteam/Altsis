import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as reminders from "../controllers/reminders.js";

// 24시간 이내 리마인더 통합 조회 (/:_id 라우트보다 먼저 선언)
router.get("/upcoming", isLoggedIn, reminders.findUpcoming);

// CRUD
router.post("/", isLoggedIn, reminders.create);
router.put("/:_id", isLoggedIn, reminders.update);
router.put("/:_id/complete", isLoggedIn, reminders.complete);
router.delete("/:_id", isLoggedIn, reminders.remove);

export { router };
