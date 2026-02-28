import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as calendarSettings from "../controllers/calendarSettings.js";

// 캘린더 설정
router.get("/settings", isLoggedIn, calendarSettings.getSettings);
router.put("/settings", isLoggedIn, calendarSettings.updateSettings);

export { router };
