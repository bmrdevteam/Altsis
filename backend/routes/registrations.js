const express = require("express");
const router = express.Router();
const registration = require("../controllers/registration");
const { isAdManager } = require("../middleware/auth");

//=================================
//             Registration
//=================================

router.post("/", isAdManager, registration.register);
router.post("/bulk", isAdManager, registration.registerBulk);

router.get("/", isAdManager, registration.find);

router.put("/:_id/:field", isAdManager, registration.update);

router.delete("/:_id", isAdManager, registration.remove);

module.exports = router;
