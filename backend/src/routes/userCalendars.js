import express from "express";
const router = express.Router();
import * as userCalendars from "../controllers/userCalendars.js";
import { isLoggedIn } from "../middleware/auth.js";

//=================================
//         UserCalendar
//=================================

router.post("/", isLoggedIn, userCalendars.create);

router.get("/", isLoggedIn, userCalendars.find);

router.put("/:_id", isLoggedIn, userCalendars.update);

router.delete("/:_id", isLoggedIn, userCalendars.remove);

export { router };
