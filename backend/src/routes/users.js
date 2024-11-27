import express from "express";
const router = express.Router();
import * as users from "../controllers/users.js";
import {
  isLoggedIn,
  isOwAdManager,
  forceNotLoggedIn,
  isAdmin,
} from "../middleware/auth.js";

//=================================
//             User
//=================================

// ____________ Authentication ____________
router.post("/login/local", forceNotLoggedIn, users.loginLocal);
router.post("/login/google", forceNotLoggedIn, users.loginGoogle);
router.get("/logout", isLoggedIn, users.logout);

// ___________ Create _____________
router.post("/", isAdmin, users.create);

// ___________ Find _____________
router.get("/", isLoggedIn, users.findUsers);
router.get("/current", isLoggedIn, users.current);
router.get("/:_id", isLoggedIn, users.findUser);
router.get("/:_id/profile", isLoggedIn, users.findProfile);

// ___________ Update (by user) _____________

router.put("/profile", isLoggedIn, users.updateProfile);
router.put("/calendar", isLoggedIn, users.updateCalendar);

// ___________ Update (by user & admin) _____________

router.put("/:_id/password", isLoggedIn, users.updatePassword);
router.put("/:_id/email", isLoggedIn, users.updateEmail);
router.put("/:_id/tel", isLoggedIn, users.updateTel);

// ___________ Update (by admin) _____________

router.put("/:_id/auth", isAdmin, users.updateAuth);

router.put("/:_id/google", isAdmin, users.connectGoogleAuth);
router.delete("/:_id/google", isAdmin, users.disconnectGoogleAuth);

router.post("/:_id/schools", isAdmin, users.registerSchool);
router.delete("/:_id/schools", isAdmin, users.deregisterSchool);

// ___________ Delete _____________
router.delete("/:_id", isAdmin, users.remove);

export { router };
