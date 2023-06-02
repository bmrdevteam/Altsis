import express from "express";
const router = express.Router();
import * as users from "../controllers/users.js";
import {
  isLoggedIn,
  isOwAdManager,
  forceNotLoggedIn,
  isAdmin,
} from "../middleware/auth.js";
import * as profile from "../controllers/profiles.js";

//=================================
//             User
//=================================

// ____________ Authentication ____________
router.post("/login/local", forceNotLoggedIn, users.loginLocal);
router.post("/login/google", forceNotLoggedIn, users.loginGoogle);
router.get("/logout", isLoggedIn, users.logout);

// ___________ create _____________
router.post("/", isAdmin, users.createByAdmin);

// ___________ find _____________
router.get("/current", isLoggedIn, users.current); //
router.get("/:_id?/profile", isLoggedIn, users.findProfile); //
router.get("/", isOwAdManager, users.findUsers);
router.get("/:_id", isOwAdManager, users.findUser);

//

// ___________ update(onself) _____________

router.post("/profile", isLoggedIn, profile.upload); //
// router.get("/profile", isLoggedIn, profile.read);
router.delete("/profile", isLoggedIn, profile.remove); //

router.put("/email", isLoggedIn, users.updateEmail);
router.put("/tel", isLoggedIn, users.updateTel);
router.put("/password", isLoggedIn, users.updatePassword);
router.put("/calendar", isLoggedIn, users.updateCalendar);

// ___________ By Admin _____________

router.put("/schools/bulk", isAdmin, users.updateSchoolsBulk); //
router.put("/:_id/password", isAdmin, users.updatePasswordByAdmin);
router.put("/:_id/google", isAdmin, users.connectGoogleByAdmin);
router.delete("/:_id/google", isAdmin, users.disconnectGoogleByAdmin);
router.put("/:_id/auth", isAdmin, users.updateAuthByAdmin);
router.put("/:_id/email", isAdmin, users.updateEmailByAdmin);
router.put("/:_id/tel", isAdmin, users.updateTelByAdmin);

router.post("/:_id/schools", isAdmin, users.createUserSchoolByAdmin);
router.delete("/:_id/schools", isAdmin, users.removeUserSchoolByAdmin);

// ___________ delete _____________
router.delete("/:_id", isAdmin, users.remove);

export { router };
