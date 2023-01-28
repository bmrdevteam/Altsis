const express = require("express");
const router = express.Router();
const registrations = require("../controllers/registrations");
const { isAdManager, isLoggedIn } = require("../middleware/auth");

//=================================
//             Registration
//=================================

router.post("/bulk", isAdManager, registrations.registerBulk);
router.post("/copy", isAdManager, registrations.registerCopy);

router.get("/", isLoggedIn, registrations.find);

router.put("/:_ids", isAdManager, registrations.update);

router.delete("/", isAdManager, registrations.remove);

module.exports = router;
