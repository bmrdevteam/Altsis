import express from "express";
const router = express.Router();
import { isLoggedIn, isAdManager } from "../middleware/auth.js";

import * as posts from "../controllers/posts.js";

// 게시글 CRUD
router.post("/", isLoggedIn, posts.create);

// 게시물 검색 (CommandPalette용, /:_id? 위에 배치)
router.get("/search", isLoggedIn, posts.search);

// 게시글 첨부파일 업로드/조회 (/:_id? 위에 배치)
router.post("/upload", isLoggedIn, posts.uploadFile);
router.get("/file/view", posts.viewFile);
router.get("/file/signed", isLoggedIn, posts.signPostFile);

// OG 메타데이터 조회 (링크 첨부용)
router.get("/og-meta", isLoggedIn, posts.fetchOgMeta);

router.get("/:_id/merge-batch", isLoggedIn, posts.mergeBatch);
router.post("/:_id/duplicate", isLoggedIn, posts.duplicate);
router.get("/:_id?", isLoggedIn, posts.find);
router.put("/:_id", isLoggedIn, posts.update);
router.delete("/:_id", isLoggedIn, posts.remove);

// 게시글 열람 대상 사용자 목록
router.get("/:_id/readers", isLoggedIn, posts.findReaders);

// 게시글 고정 (관리자만)
router.put("/:_id/pin", isAdManager, posts.pin);

export { router };
