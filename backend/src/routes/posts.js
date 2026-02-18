import express from "express";
const router = express.Router();
import { isLoggedIn, isAdManager } from "../middleware/auth.js";

import * as posts from "../controllers/posts.js";

// 게시글 CRUD
router.post("/", isLoggedIn, posts.create);
router.get("/:_id?", isLoggedIn, posts.find);
router.put("/:_id", isLoggedIn, posts.update);
router.delete("/:_id", isLoggedIn, posts.remove);

// 게시글 열람 대상 사용자 목록
router.get("/:_id/readers", isLoggedIn, posts.findReaders);

// 게시글 고정 (관리자만)
router.put("/:_id/pin", isAdManager, posts.pin);

export { router };
