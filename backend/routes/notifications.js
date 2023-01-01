const express = require("express");
const router = express.Router();
const { isLoggedIn, isReceivedNotifications } = require("../middleware/auth");

const notifications = require("../controllers/notifications");

router.post("/", isLoggedIn, notifications.send);
// router.get("/:_id?", isLoggedIn, isReceivedNotifications, notifications.find); // only when user received new notifications
router.get("/:_id?", isLoggedIn, notifications.find); // only when user received new notifications
router.put("/:_id/check", isLoggedIn, notifications.check);
router.put("/:_id/uncheck", isLoggedIn, notifications.uncheck);
router.delete("/:_ids", isLoggedIn, notifications.remove);

module.exports = router;
