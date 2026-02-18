import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as reservationSlots from "../controllers/reservationSlots.js";

router.post("/", isLoggedIn, reservationSlots.create);
router.post("/bulk", isLoggedIn, reservationSlots.createBulk);
router.get("/:_id?", isLoggedIn, reservationSlots.find);
router.put("/:_id", isLoggedIn, reservationSlots.update);
router.delete("/bulk", isLoggedIn, reservationSlots.removeBulk);
router.delete("/:_id", isLoggedIn, reservationSlots.remove);

export { router };
