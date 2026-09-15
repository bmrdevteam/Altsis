import express from "express";
const router = express.Router();
import * as forms from "../controllers/forms.js";
import { isAdManager, isLoggedIn } from "../middleware/auth.js";
import { requireFormSchoolManager } from "../middleware/schoolManagerAuth.js";

//=================================
//             Form
//=================================

router.post("/", isAdManager, forms.create);
router.post("/:_id/copy", isAdManager, requireFormSchoolManager, forms.copy);

router.get("/:_id?", isLoggedIn, forms.find);

router.put("/:_id", isAdManager, requireFormSchoolManager, forms.update);
router.put("/:_id/archive", isAdManager, requireFormSchoolManager, forms.archive);
router.put("/:_id/restore", isAdManager, requireFormSchoolManager, forms.restore);

router.put(
  "/:_id/permission",
  isAdManager,
  requireFormSchoolManager,
  forms.updatePermission
);
router.post(
  "/:_id/permission/exceptions",
  isAdManager,
  requireFormSchoolManager,
  forms.addPermissionException
);
router.delete(
  "/:_id/permission/exceptions",
  isAdManager,
  requireFormSchoolManager,
  forms.removePermissionException
);

router.delete("/:_id", isAdManager, requireFormSchoolManager, forms.remove);

export { router };
