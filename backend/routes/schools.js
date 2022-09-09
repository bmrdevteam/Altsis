const express = require("express");
const router = express.Router();
const school = require("../controllers/school");
const { isLoggedIn, isAdManager } = require("../middleware/auth");

//=================================
//             School
//=================================

/* basic create, read, delete */
router.post("/", isAdManager, school.create);
router.get("/", isAdManager, school.list);
router.get("/:_id/:field?", isAdManager, school.read);
router.delete("/:_id", isAdManager, school.delete);

/* settings */
router.put("/:_id/settings", isAdManager, school.updateSettings);

/* classrooms, subjects, seasons */
router.post("/:_id/:field", isLoggedIn, school.pushField);
router.put("/:_id/:field", isAdManager, school.updateField);
router.put("/:_id/:field/:idx", isAdManager, school.updateFieldByIdx);
router.delete("/:_id/:field/:idx", isAdManager, school.deleteFieldByIdx);

/* basic update */
router.put("/:_id/:field?", isAdManager, school.update);

module.exports = router;
