import express from "express";
const router = express.Router();
import * as files from "../controllers/files.js";
import { isOwner, isLoggedIn, isOwAdmin } from "../middleware/auth.js";

//=================================
//             File
//=================================

router.post("/archive", isLoggedIn, files.uploadArchive);
router.get("/archive/signed", isLoggedIn, files.signArchive);

router.get("/document/signed", isLoggedIn, files.signDocument);

router.get("/backup/signed", isOwAdmin, files.signBackup);

export { router };
