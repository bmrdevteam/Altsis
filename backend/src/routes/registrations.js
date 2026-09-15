import express from "express";
const router = express.Router();
import * as registrations from "../controllers/registrations.js";
import { isAdManager, isLoggedIn } from "../middleware/auth.js";
import {
  requireRegistrationCreateSchoolManager,
  requireRegistrationCopySchoolManager,
  requireRegistrationSchoolManager,
} from "../middleware/schoolManagerAuth.js";

//=================================
//             Registration
//=================================

router.post(
  "/",
  isAdManager,
  requireRegistrationCreateSchoolManager,
  registrations.create
);
router.post(
  "/copy",
  isAdManager,
  requireRegistrationCopySchoolManager,
  registrations.copyFromSeason
);

router.get("/:_id?", isLoggedIn, registrations.find);

router.put(
  "/:_id",
  isAdManager,
  requireRegistrationSchoolManager,
  registrations.update
);

router.delete(
  "/:_id",
  isAdManager,
  requireRegistrationSchoolManager,
  registrations.remove
);

export { router };
