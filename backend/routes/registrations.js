const express = require("express");
const router = express.Router();
const registration = require("../controllers/registration");
const { isAdManager, isLoggedIn } = require("../middleware/auth");

//=================================
//             Registration
//=================================

router.post("/", isAdManager, registration.register);
router.post("/bulk", isAdManager, registration.registerBulk);

router.get("/", isLoggedIn, registration.find);

router.put("/:_id", isAdManager, registration.update);

router.delete("/:_id", isAdManager, registration.remove);

module.exports = router;
