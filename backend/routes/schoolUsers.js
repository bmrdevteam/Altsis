const express = require("express");
const router = express.Router();
const schoolUser = require("../controllers/schoolUser");
const { isLoggedIn, isAdManager } = require("../middleware/auth");

// registrations
router.post("/register", isAdManager, schoolUser.register);
router.post("/register/bulk", isAdManager, schoolUser.registerBulk);
router.put(
    "/:_id/registrations/:yearIdx?",
    isAdManager,
    schoolUser.updateRegistration
);

router.put("/:_id/:field?", isAdManager, schoolUser.update);

router.get("/list", isAdManager, schoolUser.list);
router.get("/:_id", isAdManager, schoolUser.read);

module.exports = router;
