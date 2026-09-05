import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as notifications from "../controllers/notifications.js";

// 알림 설정 (/:_id 라우트보다 먼저 선언)
router.get("/settings", isLoggedIn, notifications.getSettings);
router.put("/settings", isLoggedIn, notifications.updateSettings);

// Web Push
router.get("/push/vapid-public-key", isLoggedIn, notifications.getVapidKey);
router.post("/push/subscribe", isLoggedIn, notifications.subscribePush);
router.delete("/push/subscribe", isLoggedIn, notifications.unsubscribePush);
router.post("/push/test", isLoggedIn, notifications.testPush);
router.post("/email/test", isLoggedIn, notifications.testEmail);

// 알림 일괄 확인
router.put("/bulk-check", isLoggedIn, notifications.bulkCheck);

router.get("/:_id?", isLoggedIn, notifications.find);
router.put("/:_id/check", isLoggedIn, notifications.check);
router.delete("/:_id", isLoggedIn, notifications.remove);

export { router };
