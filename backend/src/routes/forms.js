import express from "express";
const router = express.Router();
import * as forms from "../controllers/forms.js";
import { isAdManager, isLoggedIn } from "../middleware/auth.js";

//=================================
//             Form
//=================================

router.post("/", isAdManager, forms.create);
router.post("/:_id/copy", isAdManager, forms.copy);

router.get("/:_id?", isLoggedIn, forms.find);

router.put("/:_id", isAdManager, forms.update);
router.put("/:_id/archive", isAdManager, forms.archive);
router.put("/:_id/restore", isAdManager, forms.restore);

router.delete("/:_id", isAdManager, forms.remove);

export { router };
