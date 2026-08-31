import express from "express";
const router = express.Router();
import { isLoggedIn, isOwAdmin, isAdManager } from "../middleware/auth.js";
import * as ai from "../controllers/ai.js";
import * as aiLibrary from "../controllers/aiLibrary.js";

//=================================
//             AI / Alter
//=================================

// Current user daily AI Alt usage
router.get("/usage/me", isLoggedIn, ai.getMyAiUsage);

// Skill catalog
router.get("/skills", isLoggedIn, ai.listAiSkills);

// Alter prep settings (school library / season fallback)
router.get("/alter/skill-settings", isLoggedIn, ai.getAlterSkillSettings);

// Alter library (school official + teacher personal/shared)
router.get("/library", isLoggedIn, aiLibrary.list);
router.post("/library", isLoggedIn, aiLibrary.create);
router.post("/library/upload", isLoggedIn, aiLibrary.upload);
router.get("/library/:itemId", isLoggedIn, aiLibrary.findOne);
router.put("/library/:itemId", isLoggedIn, aiLibrary.update);
router.delete("/library/:itemId", isLoggedIn, aiLibrary.remove);
router.get("/library/:itemId/download", isLoggedIn, aiLibrary.download);

// Alter conversation persistence
router.get("/alter/conversations", isLoggedIn, ai.listAlterConversations);
router.post("/alter/conversations", isLoggedIn, ai.createAlterConversation);
router.post(
  "/alter/conversations/bulk-delete",
  isLoggedIn,
  ai.bulkDeleteAlterConversations
);
router.get(
  "/alter/conversations/:id/messages",
  isLoggedIn,
  ai.listAlterMessages
);
router.patch(
  "/alter/conversations/:id",
  isLoggedIn,
  ai.renameAlterConversation
);
router.delete(
  "/alter/conversations/:id",
  isLoggedIn,
  ai.deleteAlterConversation
);

// Alter attachment upload (text extract / image key)
router.post("/alter/attachment", isLoggedIn, ai.uploadAlterAttachment);

// Alter request-prompt refine (no persist / no skill run)
router.post("/alter/refine-prompt", isLoggedIn, ai.refineAlterPrompt);

// Alter unified turn (skill router)
router.post("/alter", isLoggedIn, ai.runAlter);

// Syllabus draft skill (SSE — legacy path alias)
router.post("/syllabus/review", isLoggedIn, ai.reviewSyllabusContent);

// Generate season AI guidelines template (admin/manager)
router.post(
  "/syllabus/guidelines-template",
  isAdManager,
  ai.generateGuidelinesTemplate
);

// Test API key (owner only)
router.post("/test", isOwAdmin, ai.testApiKey);

// List available models (owner | admin)
router.post("/models", isOwAdmin, ai.listModels);

export { router };
