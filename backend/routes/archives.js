const express = require("express");
const router = express.Router();
const archive = require("../controllers/archive");
const { isAdmin, isLoggedIn, isAdManager } = require("../middleware/auth");

//=================================
//             Archive
//=================================

router.post("/", isLoggedIn, archive.create);

router.get("/:_id?", isLoggedIn, archive.find);

router.put("/:_id/data", isLoggedIn, archive.updateData);

router.delete("/:_id", isLoggedIn, archive.remove);

module.exports = router;
