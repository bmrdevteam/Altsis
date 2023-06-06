import express from "express";
const router = express.Router();
import * as schools from "../controllers/schools.js";
import { isAdManager, isAdmin, isLoggedIn } from "../middleware/auth.js";

//=================================
//             School
//=================================

router.post("/", isAdmin, schools.create);

router.get("/:_id?", isLoggedIn, schools.find);

router.put("/:_id/formArchive", isAdManager, schools.updateFormArchive);
router.put("/:_id/links", isAdManager, schools.updateLinks);
router.put("/:_id/calendars", isAdManager, schools.updateCalendars);

router.delete("/:_id", isAdmin, schools.remove);

export { router };
