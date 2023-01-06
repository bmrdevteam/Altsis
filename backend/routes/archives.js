const express = require("express");
const router = express.Router();
const archives = require("../controllers/archives");
const { isAdmin, isLoggedIn, isAdManager } = require("../middleware/auth");

//=================================
//             Archive
//=================================

// router.post("/", isLoggedIn, archives.create);

router.get("/", isLoggedIn, archives.find);
router.get("/:_id", isLoggedIn, archives.findById);

router.put("/:_id", isLoggedIn, archives.update);

// router.put("/:_id/file/:field", isLoggedIn, archives.updateDataField);

// router.put("/:_id/data/:field", isLoggedIn, archives.updateDataField);

// router.delete("/:_id", isLoggedIn, archives.remove);

router.get("/test/test", isLoggedIn, archives.test);

module.exports = router;
