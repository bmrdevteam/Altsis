import express from "express";
const router = express.Router();
import { isLoggedIn, isOwner, isAdManager } from "../middleware/auth.js";
import * as ai from "../controllers/ai.js";

//=================================
//             AI / Alter
//=================================

// Skill catalog
router.get("/skills", isLoggedIn, ai.listAiSkills);

// Alter unified turn (skill router)
router.post("/alter", isLoggedIn, ai.runAlter);

// Review syllabus draft (syllabus-review skill, SSE — legacy path)
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
