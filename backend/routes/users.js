const express = require("express");
const router = express.Router();
const user = require("../controllers/user");
const {
  isLoggedIn,
  forceNotLoggedIn,
  isOwner,
  isAdmin,
  isAdManager,
} = require("../middleware/auth");
const profile = require("../controllers/profile");

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

// ___________ oneself _____________

router.get("/", isLoggedIn, user.read);
router.put("/:field", isLoggedIn, user.updateField);
// profile
router.post("/profile", isLoggedIn, profile.upload);
router.get("/profile", isLoggedIn, profile.read);
router.delete("/profile", isLoggedIn, profile.delete);

// ___________ owner -> owner _____________
router.post("/owners", isOwner, user.createOwner);
router.get("/owners", isOwner, user.readOwners);

// ___________ owner -> admin _____________
router.get("/admins", isOwner, user.readAdmin);

// ___________ admin -> manager _____________
router.post("/managers/:_id", isAdmin, user.appointManager);
router.delete("/managers/:_id", isAdmin, user.cancelManager);

// ___________ admin or manager -> member _____________
router.post("/members", isAdManager, user.createMembers);
router.get("/members", isAdManager, user.readMembers);
router.put("/members/:_id/:field", isAdManager, user.updateMemberField);
router.post("/members/enter", isAdManager, user.enterMembers);
router.delete("/members/:_id", isAdManager, user.deleteMember);

module.exports = router;
