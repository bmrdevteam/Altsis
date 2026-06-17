import express from "express";
const router = express.Router();
import * as activityTemplates from "../controllers/activityTemplates.js";
import { isLoggedIn } from "../middleware/auth.js";

router.post("/", isLoggedIn, activityTemplates.create);

router.post("/:_id/duplicate", isLoggedIn, activityTemplates.duplicate);
router.post("/:_id/instantiate", isLoggedIn, activityTemplates.instantiate);

router.get("/", isLoggedIn, activityTemplates.find);
router.get("/:_id", isLoggedIn, activityTemplates.find);
router.put("/:_id", isLoggedIn, activityTemplates.update);
router.delete("/:_id", isLoggedIn, activityTemplates.remove);

export { router };
