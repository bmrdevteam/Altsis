const express = require("express");
const router = express.Router();
const registration = require("../controllers/registration");
const { isAdManager } = require("../middleware/auth");

//=================================
//             Registration
//=================================

router.post("/", isAdManager, registration.create);

router.get("/:_id?", isAdManager, registration.find);

router.put("/:_id/teacher", isAdManager, registration.updateTeacher);
router.put("/:_id/:field", isAdManager, registration.update);

router.delete("/:_id", isAdManager, registration.delete);

module.exports = router;
