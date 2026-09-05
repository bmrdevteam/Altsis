import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as altSheetRows from "../controllers/altSheetRows.js";

// 특수 경로 먼저
router.get("/my", isLoggedIn, altSheetRows.findMy);
router.get("/submission-status", isLoggedIn, altSheetRows.findSubmissionStatus);
router.get("/count", isLoggedIn, altSheetRows.findCount);
router.get("/available-combinations", isLoggedIn, altSheetRows.findAvailableCombinations);
router.get("/pending-approvals", isLoggedIn, altSheetRows.findPendingApprovals);
router.get("/school-todos", isLoggedIn, altSheetRows.findSchoolTodos);
router.post("/draft", isLoggedIn, altSheetRows.saveDraft);
router.post("/bulk", isLoggedIn, altSheetRows.createBulk);
router.post("/send-reminder", isLoggedIn, altSheetRows.sendReminder);
router.post("/import-csv", isLoggedIn, altSheetRows.importCsv);
router.post("/bulk-approve", isLoggedIn, altSheetRows.bulkApprove);

// 일반 CRUD
router.post("/", isLoggedIn, altSheetRows.create);
router.get("/", isLoggedIn, altSheetRows.find);
router.get("/:_id", isLoggedIn, altSheetRows.findById);
router.put("/:_id", isLoggedIn, altSheetRows.update);
router.put("/:_id/assessment", isLoggedIn, altSheetRows.updateAssessment);
router.delete("/:_id", isLoggedIn, altSheetRows.remove);

export { router };
