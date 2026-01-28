import express from "express";
const router = express.Router();
import { isLoggedIn, isOwner } from "../middleware/auth.js";
import * as ai from "../controllers/ai.js";

//=================================
//             AI
//=================================

// Generate syllabus content using AI
router.post("/syllabus/generate", isLoggedIn, ai.generateSyllabusContent);

// Test API key (owner only)
router.post("/test", isOwner, ai.testApiKey);

export { router };
