import express from "express";
const router = express.Router();
import * as seasons from "../controllers/seasons.js";
import { isAdManager, isLoggedIn } from "../middleware/auth.js";

//=================================
//             Season
//=================================

router.post("/", isAdManager, seasons.create);

router.get("/:_id?", isLoggedIn, seasons.find);

router.put("/:_id/activate", isAdManager, seasons.activate);
router.put("/:_id/inactivate", isAdManager, seasons.inactivate);

router.put("/:_id/basic", isAdManager, seasons.updateBasic);
router.put("/:_id/period", isAdManager, seasons.updatePeriod);
router.put("/:_id/credits", isAdManager, seasons.updateCredits);
router.put("/:_id/classrooms", isAdManager, seasons.updateClassrooms);
router.put("/:_id/subjects", isAdManager, seasons.updateSubjects);

router.get("/:_id/form/usage", isAdManager, seasons.getFormUsage);
router.put("/:_id/form/timetable", isAdManager, seasons.updateFormTimetable);
router.put("/:_id/form/syllabus", isAdManager, seasons.updateFormSyllabus);
router.put("/:_id/form/evaluation", isAdManager, seasons.updateFormEvaluation);

router.put("/:_id/ai", isAdManager, seasons.updateAiSettings);
router.post("/:_id/ai/reference/upload", isAdManager, seasons.uploadAiReference);
router.get("/:_id/ai/reference/:index/download", isAdManager, seasons.downloadAiReference);
router.delete("/:_id/ai/reference/:index", isAdManager, seasons.deleteAiReference);

router.put("/:_id/permission/:type", isAdManager, seasons.updatePermission);

router.post(
  "/:_id/permission/:type/exceptions",
  isAdManager,
  seasons.addPermissionException
);
router.delete(
  "/:_id/permission/:type/exceptions",
  isAdManager,
  seasons.removePermissionException
);

router.delete("/:_id", isAdManager, seasons.remove);

export { router };
