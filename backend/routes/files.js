const express = require("express");
const router = express.Router();
const files = require("../controllers/files");
const { isAdManager } = require("../middleware/auth");

//=================================
//             File
//=================================

router.post("/archive", isAdManager, files.uploadArchive);
router.get("/signed", isAdManager, files.sign);
// router.get("/:_id?", isAdManager, files.find);
// router.put("/:_id/:field?", isAdManager, files.update);
router.delete("/", isAdManager, files.remove);

module.exports = router;
