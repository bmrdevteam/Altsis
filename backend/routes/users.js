const express = require("express");
const router = express.Router();
const user = require("../controllers/users");
const {
  isLoggedIn,
  isAdManager,
  forceNotLoggedIn,
} = require("../middleware/auth");
const profile = require("../controllers/profiles");

//=================================
//             User
//=================================

// ____________ common ____________
router.post("/login/local", forceNotLoggedIn, user.loginLocal);
router.post("/login/google", forceNotLoggedIn, user.loginGoogle);
router.get("/logout", isLoggedIn, user.logout);

// ___________ create _____________
router.post("/", isAdManager, user.create);
router.post("/bulk", isLoggedIn, user.createBulk);

// ___________ find _____________
router.get("/current", isLoggedIn, user.current);
router.get("/:_id?", isLoggedIn, user.find);

// ___________ update(onself) _____________

router.post("/profile", isLoggedIn, profile.upload);
// router.get("/profile", isLoggedIn, profile.read);
router.delete("/profile", isLoggedIn, profile.delete);

router.put("/google", isLoggedIn, user.connectGoogle);
router.delete("/google", isLoggedIn, user.disconnectGoogle);

// ___________ update _____________

router.put("/:_id/auth", isAdManager, user.updateAuth);
router.put("/:_id/schools", isAdManager, user.updateSchools);
router.put("/:_id/password", isLoggedIn, user.updatePassword);
router.put("/:_id", isLoggedIn, user.update);

// ___________ delete _____________
router.delete("/:_id", isAdManager, user.delete);

module.exports = router;
