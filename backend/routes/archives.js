import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";
import * as archives from "../controllers/archives.js";

//=================================
//             Archive
//=================================

router.get("/", isLoggedIn, archives.findByRegistration);
router.put("/:_id", isLoggedIn, archives.updateByRegistration);

export { router };
