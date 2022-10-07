const express = require("express");
const router = express.Router();
const school = require("../controllers/school");
const season = require("../controllers/season");
const { isAdManager } = require("../middleware/auth");

//=================================
//             Season
//=================================

router.post("/", isAdManager, season.create);

router.get("/:_id?", isAdManager, season.find);

/* _______ permissions _______ */
router.put(
  "/:_id/permissions/syllabus",
  isAdManager,
  season.updatePermissionSyllabus
);
router.put(
  "/:_id/permissions/enrollment",
  isAdManager,
  season.updatePermissionEnrollment
);

/* _______ subjects, classrooms _______ */
router.put("/:_id/subjects", isAdManager, season.updateSubjects);
router.put("/:_id/classrooms", isAdManager, season.updateClassrooms);

/* _______ forms _______ */

router.put("/:_id/forms/timetable", isAdManager, season.updateFormTimetable);
router.put("/:_id/forms/syllabus", isAdManager, season.updateFormSyllabus);
router.put("/:_id/forms/evaluation", isAdManager, season.updateFormEvaluation);

router.delete("/:_id", isAdManager, season.delete);

module.exports = router;
