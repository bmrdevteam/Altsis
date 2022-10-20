const express = require("express");
const router = express.Router();
const season = require("../controllers/season");
const { isAdManager, isLoggedIn } = require("../middleware/auth");

//=================================
//             Season
//=================================

router.post("/", isAdManager, season.create);

router.get("/:_id?", isLoggedIn, season.find);

router.put("/:_id", isAdManager, season.update);
router.put("/:_id/:field/:fieldType?", isAdManager, season.updateField);

router.delete("/:_id", isAdManager, season.delete);

module.exports = router;
