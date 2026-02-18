import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as reservations from "../controllers/reservations.js";

router.post("/", isLoggedIn, reservations.create);
router.post("/bulk", isLoggedIn, reservations.createBulk);
router.get("/my", isLoggedIn, reservations.findMy);
router.get("/:_id?", isLoggedIn, reservations.find);
router.put("/bulk-approve", isLoggedIn, reservations.bulkApprove);
router.put("/bulk-reject", isLoggedIn, reservations.bulkReject);
router.put("/:_id/approve", isLoggedIn, reservations.approve);
router.put("/:_id/reject", isLoggedIn, reservations.reject);
router.delete("/:_id", isLoggedIn, reservations.cancel);

export { router };
