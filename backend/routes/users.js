const express = require("express");
const router = express.Router();
const users = require("../controllers/users");
const {
  isLoggedIn,
  isAdManager,
  forceNotLoggedIn,
  isAdmin,
} = require("../middleware/auth");
const profile = require("../controllers/profiles");

//=================================
//             User
//=================================

// ____________ common ____________
router.post("/login/local", forceNotLoggedIn, users.loginLocal);
router.post("/login/google", forceNotLoggedIn, users.loginGoogle);
router.get("/logout", isLoggedIn, users.logout);

// ___________ create _____________
router.post("/", isAdmin, users.create);
router.post("/bulk", isAdmin, users.createBulk);

// ___________ find _____________
router.get("/current", isLoggedIn, users.current);
router.get("/:_id?", isLoggedIn, users.find);

// ___________ update(onself) _____________

router.post("/profile", isLoggedIn, profile.upload);
// router.get("/profile", isLoggedIn, profile.read);
router.delete("/profile", isLoggedIn, profile.delete);

router.put("/google", isLoggedIn, users.connectGoogle);
router.delete("/google", isLoggedIn, users.disconnectGoogle);

// ___________ update _____________

router.put("/:_id/auth", isAdManager, users.updateAuth);
router.put("/:_id/schools", isAdManager, users.updateSchools);
router.put("/:_id/password", isLoggedIn, users.updatePassword);
router.put("/:_id", isLoggedIn, users.update);

// ___________ delete _____________
router.delete("/:_id", isAdManager, users.delete);

module.exports = router;
