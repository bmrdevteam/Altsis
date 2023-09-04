import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as apps from "../controllers/apps";
//=================================
//             Apps
//=================================

router.post("/", isLoggedIn, apps.create);

router.get("/", apps.find);
router.get("/:_id", isLoggedIn, apps.findById);

// router.put("/:_id/data/:field", isLoggedIn, apps.updateDataField);

router.delete("/:_id", isLoggedIn, apps.remove);

export { router };
