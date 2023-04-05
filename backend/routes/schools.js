const express = require("express");
const router = express.Router();
const schools = require("../controllers/schools");
const { isAdManager, isLoggedIn } = require("../middleware/auth");

//=================================
//             School
//=================================

router.post("/", isAdManager, schools.create);

router.get("/:_id?/:field?", isLoggedIn, schools.find);

router.put("/:_id/form/archive", isAdManager, schools.updateFormArchive);
router.put("/:_id/links", isAdManager, schools.updateLinks);

router.delete("/:_id", isAdManager, schools.delete);

module.exports = router;
