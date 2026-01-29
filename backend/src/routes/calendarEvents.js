import express from "express";
const router = express.Router();
import * as calendarEvents from "../controllers/calendarEvents.js";
import { isLoggedIn } from "../middleware/auth.js";

//=================================
//         CalendarEvent
//=================================

router.post("/", isLoggedIn, calendarEvents.create);
router.post("/sync", isLoggedIn, calendarEvents.syncEnrollments);

router.get("/", isLoggedIn, calendarEvents.find);

router.put("/:_id", isLoggedIn, calendarEvents.update);

router.delete("/:_id", isLoggedIn, calendarEvents.remove);

export { router };
