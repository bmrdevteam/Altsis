const express = require("express");
const router = express.Router();
const schools = require("../controllers/schools");
const { isAdManager, isLoggedIn } = require("../middleware/auth");

//=================================
//             School
//=================================

router.post("/", isAdManager, schools.create);

router.get("/:_id?/:field?", isLoggedIn, schools.find);

// update subjects, classrooms, formArchive
router.put("/:_id/:field/:fieldType?", isAdManager, schools.updateField);

router.delete("/:_id", isAdManager, schools.delete);

module.exports = router;
