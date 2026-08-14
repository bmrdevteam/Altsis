import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as altFormFavorites from "../controllers/altFormFavorites.js";

router.post("/", isLoggedIn, altFormFavorites.create);
router.delete("/form/:formId", isLoggedIn, altFormFavorites.removeByForm);

export { router };
