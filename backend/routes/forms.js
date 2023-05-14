import express from "express";
const router = express.Router();
import * as forms from "../controllers/forms.js";
import { isAdManager } from "../middleware/auth.js";

//=================================
//             Form
//=================================

router.post("/", isAdManager, forms.create);
router.get("/:_id?", isAdManager, forms.find);
router.put("/:_id/:field?", isAdManager, forms.update);
router.delete("/:_id", isAdManager, forms.remove);

export { router };
