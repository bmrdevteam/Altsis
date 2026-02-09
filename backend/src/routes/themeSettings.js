import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as themeSettings from "../controllers/themeSettings.js";

// 테마 설정
router.get("/settings", isLoggedIn, themeSettings.getSettings);
router.put("/settings", isLoggedIn, themeSettings.updateSettings);

export { router };
