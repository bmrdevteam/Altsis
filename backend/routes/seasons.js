const express = require("express");
const router = express.Router();
const school = require("../controllers/school");
const season = require("../controllers/season");
const { isAdManager, isLoggedIn } = require("../middleware/auth");

//=================================
//             Season
//=================================

router.post("/", isAdManager, season.create);

router.get("/:_id?", isLoggedIn, season.find);

/* _______ permissions _______ */
// type: syllabus, enrollment, evaluation
router.put(
  "/:_id/permissions/:permissionType",
  isAdManager,
  season.updatePermission
);

//formEvaluation
router.put("/:_id/forms/evaluation", isAdManager, season.updateFormEvaluation);

// formType: formTimetable, formSyllabus
router.put("/:_id/forms/:formType", isAdManager, season.updateForm);

// field: subjects, classrooms
router.put("/:_id/:field", isAdManager, season.updateField);

router.delete("/:_id", isAdManager, season.delete);

module.exports = router;
