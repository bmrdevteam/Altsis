import express from "express";
import { isLoggedIn } from "../middleware/auth.js";
const router = express.Router();
import * as workspaces from "../controllers/workspaces.js";
import passport from "passport";

router.get(
  "/auth",
  isLoggedIn,
  passport.authenticate("workspace", {
    scope: ["profile", "email", "https://www.googleapis.com/auth/calendar"],
    accessType: "offline",
  })
);
router.get("/auth/callback", isLoggedIn, workspaces.callback);

router.get("/", isLoggedIn, workspaces.find);

router.put("/", isLoggedIn, workspaces.updateAccessToken);

router.delete("/", isLoggedIn, workspaces.remove);

export { router };
