import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as notifications from "../controllers/notifications.js";

router.post("/", isLoggedIn, notifications.send);
router.get("/:_id?", isLoggedIn, notifications.find);
router.put("/:_id/check", isLoggedIn, notifications.check);
router.put("/:_id/uncheck", isLoggedIn, notifications.uncheck);
router.delete("/", isLoggedIn, notifications.remove);

export { router };
