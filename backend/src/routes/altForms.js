import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as altForms from "../controllers/altForms.js";

// Alt Form CRUD
router.post("/", isLoggedIn, altForms.create);
router.get("/:_id?", isLoggedIn, altForms.find);
router.put("/:_id", isLoggedIn, altForms.update);
router.delete("/:_id", isLoggedIn, altForms.remove);

export { router };
