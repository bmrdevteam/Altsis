import express from "express";
const router = express.Router();
import * as registrations from "../controllers/registrations.js";
import { isAdManager, isLoggedIn } from "../middleware/auth.js";

//=================================
//             Registration
//=================================

router.post("/", isAdManager, registrations.create);

router.post("/bulk", isAdManager, registrations.registerBulk);
router.post("/copy", isAdManager, registrations.registerCopy);

router.get("/:_id?", isLoggedIn, registrations.find);

router.put("/:_ids", isAdManager, registrations.update);

router.delete("/", isAdManager, registrations.remove);

export { router };
