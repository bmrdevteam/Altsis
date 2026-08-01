import express from "express";
const router = express.Router();
import * as goals from "../controllers/goals.js";
import { isLoggedIn } from "../middleware/auth.js";

router.get("/me", isLoggedIn, goals.findMe);

export { router };
