const express = require("express");
const router = express.Router();
const registrations = require("../controllers/registrations");
const { isAdManager, isLoggedIn } = require("../middleware/auth");

//=================================
//             Registration
//=================================

router.post("/", isAdManager, registrations.register);
router.post("/bulk", isAdManager, registrations.registerBulk);

router.get("/", isLoggedIn, registrations.find);

router.put("/:_id", isAdManager, registrations.update);

router.delete("/:_id", isAdManager, registrations.remove);

module.exports = router;
