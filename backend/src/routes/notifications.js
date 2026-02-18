import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as notifications from "../controllers/notifications.js";

// 알림 설정 (/:_id 라우트보다 먼저 선언)
router.get("/settings", isLoggedIn, notifications.getSettings);
router.put("/settings", isLoggedIn, notifications.updateSettings);

// 알림 일괄 확인
router.put("/bulk-check", isLoggedIn, notifications.bulkCheck);

router.get("/:_id?", isLoggedIn, notifications.find);
router.put("/:_id/check", isLoggedIn, notifications.check);
router.delete("/:_id", isLoggedIn, notifications.remove);

export { router };
