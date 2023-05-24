import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";
import * as archives from "../controllers/archives.js";

//=================================
//             Archive
//=================================

router.get("/", isLoggedIn, archives.find);
router.put("/:_id", isLoggedIn, archives.update);

router.get("/:_id", isLoggedIn, archives.findByLabel); //deprecated
router.put("/", isLoggedIn, archives.updateBulk); //deprecated

export { router };
