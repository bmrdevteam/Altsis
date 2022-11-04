const express = require("express");
const router = express.Router();
const archive = require("../controllers/archive");
const { isAdmin, isLoggedIn, isAdManager } = require("../middleware/auth");

//=================================
//             Archive
//=================================

router.post("/", isLoggedIn, archive.create);

router.get("/", isLoggedIn, archive.find);
router.get("/:_id", isLoggedIn, archive.findById);

router.put("/:_id/data/:field", isLoggedIn, archive.updateDataField);

router.delete("/:_id", isLoggedIn, archive.remove);

module.exports = router;
