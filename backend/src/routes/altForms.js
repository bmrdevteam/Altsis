import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as altForms from "../controllers/altForms.js";
import * as formAiChat from "../controllers/formAiChat.js";

// 특수 경로 먼저
router.post("/import", isLoggedIn, altForms.importForm);
router.get("/:_id/export", isLoggedIn, altForms.exportForm);
router.post("/:_id/duplicate", isLoggedIn, altForms.duplicate);
router.put("/:_id/sheet-opened", isLoggedIn, altForms.markSheetOpened);
router.post("/:_id/ai-chat/messages", isLoggedIn, formAiChat.sendMessage);
router.delete(
  "/:_id/ai-chat/sessions/:sessionId",
  isLoggedIn,
  formAiChat.removeSession
);
router.get(
  "/:_id/ai-chat/sessions/:sessionId/messages",
  isLoggedIn,
  formAiChat.listMessages
);
router.get("/:_id/ai-chat/sessions", isLoggedIn, formAiChat.listSessions);

// Alt Form CRUD
router.post("/", isLoggedIn, altForms.create);
router.get("/:_id?", isLoggedIn, altForms.find);
router.put("/:_id", isLoggedIn, altForms.update);
router.delete("/:_id", isLoggedIn, altForms.remove);

export { router };
