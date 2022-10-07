const express = require("express");
const router = express.Router();
const school = require("../controllers/school");
const { isAdManager } = require("../middleware/auth");

//=================================
//             School
//=================================

router.post("/", isAdManager, school.create);

router.get("/:_id?/:field?", isAdManager, school.find);

router.put("/:_id/subjects", isAdManager, school.updateSubjects);
router.put("/:_id/classrooms", isAdManager, school.updateClassrooms);
router.put("/:_id/formArchive", isAdManager, school.updateFormArchive);

router.delete("/:_id", isAdManager, school.delete);

module.exports = router;
