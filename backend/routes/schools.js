const express = require("express");
const router = express.Router();
const school = require("../controllers/school");
const { isAdManager, isLoggedIn } = require("../middleware/auth");

//=================================
//             School
//=================================

router.post("/", isAdManager, school.create);

router.get("/:_id?/:field?", isLoggedIn, school.find);

// update subjects, classrooms, formArchive
router.put("/:_id/:field", isAdManager, school.updateField);

router.delete("/:_id", isAdManager, school.delete);

module.exports = router;
