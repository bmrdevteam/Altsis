import express from "express";
const router = express.Router();
import * as activities from "../controllers/activities.js";
import { isLoggedIn } from "../middleware/auth.js";

router.post("/", isLoggedIn, activities.create);
router.get("/", isLoggedIn, activities.find);

router.get("/:_id/submissions", isLoggedIn, activities.findSubmissions);
router.get("/:_id/my-submission", isLoggedIn, activities.findMySubmission);
router.post("/:_id/submit", isLoggedIn, activities.submitActivity);
router.put("/:_id/draft", isLoggedIn, activities.saveDraft);
router.post(
  "/:_id/submissions/:submissionId/feedback",
  isLoggedIn,
  activities.addFeedback
);
router.put(
  "/:_id/submissions/:submissionId/complete",
  isLoggedIn,
  activities.completeSubmission
);

router.put("/:_id/publish", isLoggedIn, activities.publish);
router.put("/:_id/close", isLoggedIn, activities.close);
router.get("/:_id", isLoggedIn, activities.find);
router.put("/:_id", isLoggedIn, activities.update);
router.delete("/:_id", isLoggedIn, activities.remove);

export { router };
