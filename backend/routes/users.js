const express = require("express");
const router = express.Router();
const user = require("../controllers/user");
const { isLoggedIn, forceNotLoggedIn } = require("../middleware/auth");
const profile = require("../controllers/profile");

//=================================
//             User
//=================================

// ___________ update(myself) _____________
// profile
router.post("/profile", isLoggedIn, profile.upload);
// router.get("/profile", isLoggedIn, profile.read);
router.delete("/profile", isLoggedIn, profile.delete);

// ____________ common ____________

/* local & google login */
router.post("/login/local", forceNotLoggedIn, user.loginLocal);
router.post("/login/google", forceNotLoggedIn, user.loginGoogle);

/* logout */
router.get("/logout", isLoggedIn, user.logout);

// ___________ create _____________
router.post("/", isLoggedIn, user.create);
router.post("/bulk", isLoggedIn, user.createBulk);

// ___________ find _____________
router.get("/current", isLoggedIn, user.current);
router.get("/", isLoggedIn, user.find);

// ___________ delete _____________
router.delete("/:_id", isLoggedIn, user.delete);

// ___________ update _____________
router.put("/:_id/auth", isLoggedIn, user.updateAuth);
router.put("/:_id/schools", isLoggedIn, user.updateSchools);

// ___________ update(myself) _____________

router.put("/google", isLoggedIn, user.connectGoogle);
router.delete("/google", isLoggedIn, user.disconnectGoogle);
router.put("/:field", isLoggedIn, user.updateField);

module.exports = router;
