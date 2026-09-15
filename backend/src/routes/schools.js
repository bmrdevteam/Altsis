import express from "express";
const router = express.Router();
import * as schools from "../controllers/schools.js";
import { isAdManager, isAdmin, isLoggedIn } from "../middleware/auth.js";
import { requireSchoolManagerParam } from "../middleware/schoolManagerAuth.js";

//=================================
//             School
//=================================

router.post("/", isAdmin, schools.create);

router.get(
  "/:_id/dashboard",
  isAdManager,
  requireSchoolManagerParam,
  schools.dashboard
);
router.get("/:_id?", isLoggedIn, schools.find);

router.put(
  "/:_id/formArchive",
  isAdManager,
  requireSchoolManagerParam,
  schools.updateFormArchive
);
router.put(
  "/:_id/features",
  isAdManager,
  requireSchoolManagerParam,
  schools.updateFeatureFlags
);
router.put(
  "/:_id/boardCreationPermission",
  isAdManager,
  requireSchoolManagerParam,
  schools.updateBoardCreationPermission
);
router.put(
  "/:_id/boardNotificationEvents",
  isAdManager,
  requireSchoolManagerParam,
  schools.updateBoardNotificationEvents
);
router.put(
  "/:_id/links",
  isAdManager,
  requireSchoolManagerParam,
  schools.updateLinks
);
router.put(
  "/:_id/goalDisplay",
  isAdManager,
  requireSchoolManagerParam,
  schools.updateGoalDisplay
);

router.get(
  "/:_id/ai-config",
  isAdManager,
  requireSchoolManagerParam,
  schools.findAiConfig
);
router.put(
  "/:_id/ai-config",
  isAdManager,
  requireSchoolManagerParam,
  schools.updateAiConfig
);
router.get(
  "/:_id/ai-library",
  isAdManager,
  requireSchoolManagerParam,
  schools.listAiLibrary
);
router.post(
  "/:_id/ai-library",
  isAdManager,
  requireSchoolManagerParam,
  schools.createAiLibraryItem
);
router.post(
  "/:_id/ai-library/upload",
  isAdManager,
  requireSchoolManagerParam,
  schools.uploadAiLibraryItem
);
router.put(
  "/:_id/ai-library/:itemId",
  isAdManager,
  requireSchoolManagerParam,
  schools.updateAiLibraryItem
);
router.get(
  "/:_id/ai-library/:itemId/download",
  isAdManager,
  requireSchoolManagerParam,
  schools.downloadAiLibraryItem
);
router.delete(
  "/:_id/ai-library/:itemId",
  isAdManager,
  requireSchoolManagerParam,
  schools.deleteAiLibraryItem
);

// 삭제된 기록 양식 (휴지통) 관리
router.put(
  "/:_id/deletedFormArchive/:label/restore",
  isAdManager,
  requireSchoolManagerParam,
  schools.restoreFormArchive
);
router.delete(
  "/:_id/deletedFormArchive/:label",
  isAdManager,
  requireSchoolManagerParam,
  schools.removeFormArchive
);

router.delete("/:_id", isAdmin, schools.remove);

export { router };
