const express = require("express");
const router = express.Router();
const archives = require("../controllers/archives");
const { isAdmin, isLoggedIn, isAdManager } = require("../middleware/auth");

//=================================
//             Archive
//=================================

router.get("/:_id", isLoggedIn, archives.findByLabel);
router.get("/", isLoggedIn, archives.find);

router.put("/", isLoggedIn, archives.updateBulk);

router.put("/:_id", isLoggedIn, archives.update);

module.exports = router;
