import express from "express";
const router = express.Router();
import * as seasons from "../controllers/seasons.js";
import { isAdManager, isLoggedIn } from "../middleware/auth.js";

//=================================
//             Season
//=================================

router.post("/", isAdManager, seasons.create);

router.get("/:_id?", isLoggedIn, seasons.find);

router.put("/:_id/activate", isAdManager, seasons.activate);
router.put("/:_id/inactivate", isAdManager, seasons.inactivate);

router.put("/:_id/permission/:type", isAdManager, seasons.updatePermission);

router.put("/:_id/:field/:fieldType?", isAdManager, seasons.updateField);

router.delete("/:_id", isAdManager, seasons.remove);

export { router };
