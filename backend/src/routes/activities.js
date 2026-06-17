import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as activities from "../controllers/activities.js";

router.get("/:_id/submissions", isLoggedIn, activities.findSubmissions);
router.post(
  "/:_id/submissions/:submissionId/feedback",
  isLoggedIn,
  activities.addFeedback
);
router.put(
  "/:_id/submissions/:submissionId/status",
  isLoggedIn,
  activities.updateSubmissionStatus
);
router.put("/:_id/publish", isLoggedIn, activities.publish);

router.post("/", isLoggedIn, activities.create);
router.get("/:_id?", isLoggedIn, activities.find);
router.put("/:_id", isLoggedIn, activities.update);
router.delete("/:_id", isLoggedIn, activities.remove);

export { router };
