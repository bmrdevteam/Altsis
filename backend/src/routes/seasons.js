import express from "express";
const router = express.Router();
import * as seasons from "../controllers/seasons.js";
import { isAdManager, isLoggedIn } from "../middleware/auth.js";
import {
  requireSchoolManagerBodySchool,
  requireSeasonSchoolManager,
} from "../middleware/schoolManagerAuth.js";

//=================================
//             Season
//=================================

router.post("/", isAdManager, requireSchoolManagerBodySchool, seasons.create);

router.get("/:_id?", isLoggedIn, seasons.find);

router.put(
  "/:_id/activate",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.activate
);
router.put(
  "/:_id/inactivate",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.inactivate
);

router.put(
  "/:_id/basic",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.updateBasic
);
router.put(
  "/:_id/period",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.updatePeriod
);
router.put(
  "/:_id/credits",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.updateCredits
);
router.put(
  "/:_id/classrooms",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.updateClassrooms
);
router.put(
  "/:_id/subjects",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.updateSubjects
);

router.get(
  "/:_id/form/usage",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.getFormUsage
);
router.put(
  "/:_id/form/timetable",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.updateFormTimetable
);
router.put(
  "/:_id/form/syllabus",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.updateFormSyllabus
);
router.put(
  "/:_id/form/evaluation",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.updateFormEvaluation
);

router.put(
  "/:_id/ai",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.updateAiSettings
);
router.post(
  "/:_id/ai/reference/upload",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.uploadAiReference
);
router.get(
  "/:_id/ai/reference/:index/download",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.downloadAiReference
);
router.delete(
  "/:_id/ai/reference/:index",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.deleteAiReference
);

router.put(
  "/:_id/permission/:type",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.updatePermission
);

router.post(
  "/:_id/permission/:type/exceptions",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.addPermissionException
);
router.delete(
  "/:_id/permission/:type/exceptions",
  isAdManager,
  requireSeasonSchoolManager,
  seasons.removePermissionException
);

router.delete("/:_id", isAdManager, requireSeasonSchoolManager, seasons.remove);

export { router };
