import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as surveyResponses from "../controllers/surveyResponses.js";

// 설문 응답 CRUD
router.post("/", isLoggedIn, surveyResponses.create);
router.get("/my", isLoggedIn, surveyResponses.findMy);
router.get("/stats", isLoggedIn, surveyResponses.stats);
router.get("/file/signed", isLoggedIn, surveyResponses.signFile);
router.get("/", isLoggedIn, surveyResponses.findAll);
router.put("/:_id", isLoggedIn, surveyResponses.update);

// 파일 업로드
router.post("/upload", isLoggedIn, surveyResponses.uploadFile);

export { router };
