const express = require("express");
const router = express.Router();
const apps = require("../controllers/apps");
const { isAdmin, isLoggedIn, isAdManager } = require("../middleware/auth");

//=================================
//             Apps
//=================================

router.post("/", isLoggedIn, apps.create);

router.get("/", apps.find);
router.get("/:_id", isLoggedIn, apps.findById);

// router.put("/:_id/data/:field", isLoggedIn, apps.updateDataField);

router.delete("/:_id", isLoggedIn, apps.remove);

module.exports = router;
