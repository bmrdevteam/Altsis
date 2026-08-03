import express from "express";
const router = express.Router();
import { isLoggedIn, isOwner, isAdManager } from "../middleware/auth.js";
import * as ai from "../controllers/ai.js";

//=================================
//             AI / Alter
//=================================

// Skill catalog
router.get("/skills", isLoggedIn, ai.listAiSkills);

// Alter prep settings (school library / season fallback)
router.get("/alter/skill-settings", isLoggedIn, ai.getAlterSkillSettings);

// Alter conversation persistence
router.get("/alter/conversations", isLoggedIn, ai.listAlterConversations);
router.post("/alter/conversations", isLoggedIn, ai.createAlterConversation);
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
router.post("/test", isOwner, ai.testApiKey);

// List available models (owner only)
router.post("/models", isOwner, ai.listModels);

export { router };
