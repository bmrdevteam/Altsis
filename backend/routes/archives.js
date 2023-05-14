import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";
import * as archives from "../controllers/archives.js";

//=================================
//             Archive
//=================================

router.get("/:_id", isLoggedIn, archives.findByLabel);
router.get("/", isLoggedIn, archives.find);

router.put("/", isLoggedIn, archives.updateBulk);

router.put("/:_id", isLoggedIn, archives.update);

export { router };
