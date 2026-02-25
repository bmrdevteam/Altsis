import express from "express";
const router = express.Router();
import * as schools from "../controllers/schools.js";
import { isAdManager, isAdmin, isLoggedIn } from "../middleware/auth.js";

//=================================
//             School
//=================================

router.post("/", isAdmin, schools.create);

router.get("/:_id/dashboard", isAdManager, schools.dashboard);
router.get("/:_id?", isLoggedIn, schools.find);

router.put("/:_id/formArchive", isAdManager, schools.updateFormArchive);
router.put("/:_id/features", isAdManager, schools.updateFeatureFlags);
router.put("/:_id/boardNotificationEvents", isAdManager, schools.updateBoardNotificationEvents);
router.put("/:_id/links", isAdManager, schools.updateLinks);

// 삭제된 기록 양식 (휴지통) 관리
router.put(
  "/:_id/deletedFormArchive/:label/restore",
  isAdManager,
  schools.restoreFormArchive
);
router.delete(
  "/:_id/deletedFormArchive/:label",
  isAdManager,
  schools.removeFormArchive
);

router.delete("/:_id", isAdmin, schools.remove);

export { router };
