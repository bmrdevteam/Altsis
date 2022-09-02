const express = require("express");
const router = express.Router();
const user = require("../controllers/user");
const {
  isLoggedIn,
  isNotLoggedIn,
  forceNotLoggedIn,
  isOwner,
  isAdmin,
  isAdManager,
} = require("../middleware/auth");
const profile = require("../controllers/profile");
const { check } = require("express-validator");
//=================================
//             User
//=================================

// ____________ common ____________

/* local & google login */
router.post("/login/local", forceNotLoggedIn, user.loginLocal);
router.post("/login/google", forceNotLoggedIn, user.loginGoogle);

/* connect to social account */
router.post("/google", isLoggedIn, user.connectGoogle);
router.delete("/google", isLoggedIn, user.disconnectGoogle);

/* logout */
router.get("/logout", isLoggedIn, user.logout);

// profile
router.post("/profile", isLoggedIn, profile.upload);
router.get("/profile", isLoggedIn, profile.read);
router.delete("/profile", isLoggedIn, profile.delete);

// read
router.get("/", isLoggedIn, user.read);
router.get("/owners", isOwner, user.readOwners);
router.get("/admin", isOwner, user.readAdmin);
router.get("/members", isAdManager, user.readMembers);

router.put("/:field", isLoggedIn, user.updateField);

// ____________ owner ____________
router.post("/owners", isOwner, user.createOwner);

// ____________ admin ____________
// admin appoints member as manager
router.post("/managers/:_id", isAdmin, user.appointManager);
router.delete("/managers/:_id", isAdmin, user.cancelManager);

// ____________ admin + manager ____________
router.post("/members", isAdManager, user.createMembers);
router.post("/members/enter", isAdManager, user.enterMembers);

router.put("/members/:_id/:field", isAdManager, user.updateMemberField);
router.delete("/members/:_id", isAdManager, user.deleteMember);

module.exports = router;
