const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");

const notifications = require("../controllers/notifications");

router.post("/", isLoggedIn, notifications.send);
router.get("/:_id?", isLoggedIn, notifications.find);
router.put("/:_id/check", isLoggedIn, notifications.check);
router.put("/:_id/uncheck", isLoggedIn, notifications.uncheck);
router.delete("/", isLoggedIn, notifications.remove);

module.exports = router;
