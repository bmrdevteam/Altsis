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

// 양식 열람 권한 관리
router.put("/:_id/permission", isAdManager, forms.updatePermission);
router.post("/:_id/permission/exceptions", isAdManager, forms.addPermissionException);
router.delete("/:_id/permission/exceptions", isAdManager, forms.removePermissionException);

router.delete("/:_id", isAdManager, forms.remove);

export { router };
