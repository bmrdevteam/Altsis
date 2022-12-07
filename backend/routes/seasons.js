const express = require("express");
const router = express.Router();
const season = require("../controllers/seasons");
const { isAdManager, isLoggedIn } = require("../middleware/auth");

//=================================
//             Season
//=================================

router.post("/", isAdManager, season.create);

router.get("/:_id?", isLoggedIn, season.find);

router.post("/:_id/activate", isAdManager, season.activate);
router.post("/:_id/inactivate", isAdManager, season.inactivate);

router.put("/:_id/:field/:fieldType?", isAdManager, season.updateField);

router.delete("/:_id", isAdManager, season.delete);

module.exports = router;
