const express = require("express");
const router = express.Router();
const seasons = require("../controllers/seasons");
const { isAdManager, isLoggedIn } = require("../middleware/auth");

//=================================
//             Season
//=================================

router.post("/", isAdManager, seasons.create);

router.get("/:_id?", isLoggedIn, seasons.find);

router.post("/:_id/activate", isAdManager, seasons.activate);
router.post("/:_id/inactivate", isAdManager, seasons.inactivate);

router.put("/:_id/:field/:fieldType?", isAdManager, seasons.updateField);

router.delete("/:_id", isAdManager, seasons.delete);

module.exports = router;
