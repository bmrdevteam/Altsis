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
router.get("/:_id?/profile", isLoggedIn, users.findProfile);
router.get("/:_id?", isLoggedIn, users.find);

// ___________ update(onself) _____________

router.post("/profile", isLoggedIn, profile.upload);
// router.get("/profile", isLoggedIn, profile.read);
router.delete("/profile", isLoggedIn, profile.delete);

router.put("/google", isLoggedIn, users.connectGoogle);
router.delete("/google", isLoggedIn, users.disconnectGoogle);

router.put("/email", isLoggedIn, users.updateEmail);
router.put("/tel", isLoggedIn, users.updateTel);
router.put("/password", isLoggedIn, users.updatePassword);

// ___________ update _____________

router.put("/schools/bulk", isAdmin, users.updateSchoolsBulk);
router.put("/:_id/password", isLoggedIn, users.updatePasswordByAdmin);

router.put("/:_id", isLoggedIn, users.update);

// ___________ delete _____________
router.delete("/", isAdmin, users.delete);

module.exports = router;
