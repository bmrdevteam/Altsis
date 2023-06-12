import express from "express";
const router = express.Router();
import * as files from "../controllers/files.js";
import { isAdManager, isOwner, isLoggedIn } from "../middleware/auth.js";

//=================================
//             File
//=================================

router.post("/archive", isAdManager, files.uploadArchive);
router.get("/archive/signed", isLoggedIn, files.signArchive);

router.get("/document/signed", isLoggedIn, files.signDocument);

router.get("/backup/signed", isOwner, files.signBackup);

router.post("/restore", isOwner, files.restoreBackup);

// router.get("/:_id?", isAdManager, files.find);
// router.put("/:_id/:field?", isAdManager, files.update);
router.delete("/", isAdManager, files.remove);

export { router };
