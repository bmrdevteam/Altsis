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

router.put("/:_id/period", isAdManager, seasons.updatePeriod);
router.put("/:_id/classrooms", isAdManager, seasons.updateClassrooms);
router.put("/:_id/subjects", isAdManager, seasons.updateSubjects);

router.put("/:_id/form/timetable", isAdManager, seasons.updateFormTimetable);
router.put("/:_id/form/syllabus", isAdManager, seasons.updateFormSyllabus);
router.put("/:_id/form/evaluation", isAdManager, seasons.updateFormEvaluation);

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
