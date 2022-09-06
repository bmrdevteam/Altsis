const express = require("express");
const router = express.Router();
const school = require("../controllers/school");
const { isLoggedIn, isAdManager } = require("../middleware/auth");

//=================================
//             School
//=================================

router.post("/", isAdManager, school.create);
router.get("/", isAdManager, school.list);
router.get("/:_id/classrooms", isLoggedIn, school.classrooms);
router.get("/:_id/subjects", isLoggedIn, school.subjects);
router.put("/:_id/info/:field?", isAdManager, school.update);
router.delete("/:_id", isAdManager, school.delete);

// ________________________________________
// ---- classrooms, subjects, seasons ----
// ________________________________________

router.put("/:_id/settings", isAdManager, school.updateSettings);
router.get("/:_id/settings", isAdManager, school.readSettings);

router.post("/:_id/:field", isAdManager, school.createField);
router.put("/:_id/:field", isAdManager, school.updateField);
router.put("/:_id/:field/:idx", isAdManager, school.updateFieldByIdx);
router.delete("/:_id/:field/:idx", isAdManager, school.deleteFieldByIdx);

module.exports = router;
