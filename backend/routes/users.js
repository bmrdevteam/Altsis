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
router.post("/", isAdmin, users.create);

// ___________ find _____________
router.get("/current", isLoggedIn, users.current);
router.get("/:_id/profile", isLoggedIn, users.findProfile);
router.get("/", isOwAdManager, users.findUsers);
router.get("/:_id", isOwAdManager, users.findUser);

//

// ___________ update(onself) _____________

router.put("/profile", isLoggedIn, profile.update);

router.put("/calendar", isLoggedIn, users.updateCalendar);

// ___________ By Admin _____________

router.put("/schools/bulk", isAdmin, users.updateSchoolsBulk); //
router.put("/:_id/password", isLoggedIn, users.updatePassword);
router.put("/:_id/google", isAdmin, users.connectGoogleAuth);
router.delete("/:_id/google", isAdmin, users.disconnectGoogleAuth);
router.put("/:_id/auth", isAdmin, users.updateAuth);
router.put("/:_id/email", isLoggedIn, users.updateEmail);
router.put("/:_id/tel", isLoggedIn, users.updateTel);

router.post("/:_id/schools", isAdmin, users.registerSchool);
router.delete("/:_id/schools", isAdmin, users.deregisterSchool);

// ___________ delete _____________
router.delete("/:_id", isAdmin, users.remove);

export { router };
