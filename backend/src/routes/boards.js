import express from "express";
const router = express.Router();
import { isLoggedIn, isAdManager } from "../middleware/auth.js";

import * as boards from "../controllers/boards.js";

// 게시판 CRUD (권한 체크는 컨트롤러에서 canManageBoard로 처리)
router.post("/", isLoggedIn, boards.create);
router.get("/:_id?", isLoggedIn, boards.find);
router.put("/:_id", isLoggedIn, boards.update);
router.delete("/:_id", isLoggedIn, boards.remove);

// 보드 커버 이미지
router.put("/:_id/cover-image", isLoggedIn, boards.updateCoverImage);
router.delete("/:_id/cover-image", isLoggedIn, boards.deleteCoverImage);

// 멤버 관리 (보드에 접근할 수 있는 사람)
router.get("/:_id/members/list", isLoggedIn, boards.findMemberList);
router.put("/:_id/members", isLoggedIn, boards.updateMembers);
router.post("/:_id/members/users", isLoggedIn, boards.addMemberUser);
router.delete("/:_id/members/users", isLoggedIn, boards.removeMemberUser);

// 작성자 관리 (게시글을 작성할 수 있는 사람)
router.put("/:_id/writers", isLoggedIn, boards.updateWriters);
router.post("/:_id/writers/users", isLoggedIn, boards.addWriterUser);
router.delete("/:_id/writers/users", isLoggedIn, boards.removeWriterUser);

export { router };
