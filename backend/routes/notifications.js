import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as notifications from "../controllers/notifications.js";

router.post("/", isLoggedIn, notifications.send);
router.get("/:_id?", isLoggedIn, notifications.find);
router.put("/:_id/check", isLoggedIn, notifications.check);
router.delete("/:_id", isLoggedIn, notifications.remove);

export { router };
