import express from "express";
const router = express.Router();
import { isLoggedIn, isOwAdmin, isAdManager } from "../middleware/auth.js";
import { requireSeasonSchoolManagerFromBody } from "../middleware/schoolManagerAuth.js";
import * as ai from "../controllers/ai.js";
import * as aiLibrary from "../controllers/aiLibrary.js";
import * as alterChat from "./alterChatHandlers.js";
import * as alterTurn from "./alterTurnHandler.js";
import * as alterSchedule from "./alterScheduleHandlers.js";

//=================================
//             AI / Alter
//=================================

// Current user daily AI Alt usage
router.get("/usage/me", isLoggedIn, ai.getMyAiUsage);

// Skill catalog
router.get("/skills", isLoggedIn, ai.listAiSkills);

// Alter prep settings (school library / season fallback)
router.get("/alter/skill-settings", isLoggedIn, alterChat.getAlterSkillSettings);

// Alter library (school official + teacher personal/shared)
router.get("/library", isLoggedIn, aiLibrary.list);
router.post("/library", isLoggedIn, aiLibrary.create);
router.post("/library/upload", isLoggedIn, aiLibrary.upload);
router.get("/library/:itemId", isLoggedIn, aiLibrary.findOne);
router.put("/library/:itemId", isLoggedIn, aiLibrary.update);
router.delete("/library/:itemId", isLoggedIn, aiLibrary.remove);
router.get("/library/:itemId/download", isLoggedIn, aiLibrary.download);

// Alter conversation persistence
router.get("/alter/conversations", isLoggedIn, alterChat.listAlterConversations);
router.post("/alter/conversations", isLoggedIn, alterChat.createAlterConversation);
router.post(
  "/alter/conversations/bulk-delete",
  isLoggedIn,
  alterChat.bulkDeleteAlterConversations
);
router.get(
  "/alter/conversations/:id/messages",
  isLoggedIn,
  alterChat.listAlterMessages
);
router.patch(
  "/alter/conversations/:id",
  isLoggedIn,
  alterChat.renameAlterConversation
);
router.delete(
  "/alter/conversations/:id",
  isLoggedIn,
  alterChat.deleteAlterConversation
);

// Alter attachment upload (text extract / image key)
router.post("/alter/attachment", isLoggedIn, alterChat.uploadAlterAttachment);

// Alter request-prompt refine (no persist / no skill run)
router.post("/alter/refine-prompt", isLoggedIn, ai.refineAlterPrompt);

// Alter routines (teacher). Confirm is the only save path for a chat proposal.
router.get("/alter/schedules", isLoggedIn, alterSchedule.list);
router.post("/alter/schedules/confirm", isLoggedIn, alterSchedule.confirm);
router.post("/alter/schedules", isLoggedIn, alterSchedule.create);
router.put("/alter/schedules/:id", isLoggedIn, alterSchedule.update);
router.delete("/alter/schedules/:id", isLoggedIn, alterSchedule.remove);
router.post("/alter/schedules/:id/run", isLoggedIn, alterSchedule.runNow);

// Alter unified turn (skill router)
router.post("/alter", isLoggedIn, alterTurn.runAlter);

// Syllabus draft skill (SSE — legacy path alias)
router.post("/syllabus/review", isLoggedIn, ai.reviewSyllabusContent);

// Generate season AI guidelines template (admin/manager)
router.post(
  "/syllabus/guidelines-template",
  isAdManager,
  requireSeasonSchoolManagerFromBody,
  ai.generateGuidelinesTemplate
);

// Test API key (owner only)
router.post("/test", isOwAdmin, ai.testApiKey);

// List available models (owner | admin)
router.post("/models", isOwAdmin, ai.listModels);

export { router };
