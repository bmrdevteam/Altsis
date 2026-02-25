import express from "express";
const router = express.Router();
import { isLoggedIn, isAdManager } from "../middleware/auth.js";
import { isBoardEnabled } from "../middleware/board.js";

import * as boards from "../controllers/boards.js";

// 게시판 CRUD (권한 체크는 컨트롤러에서 canManageBoard로 처리)
router.post("/", isLoggedIn, isBoardEnabled, boards.create);
router.get("/:_id?", isLoggedIn, isBoardEnabled, boards.find);
router.put("/:_id", isLoggedIn, isBoardEnabled, boards.update);
router.delete("/:_id", isLoggedIn, isBoardEnabled, boards.remove);

// 보드 커버 이미지
router.put("/:_id/cover-image", isLoggedIn, isBoardEnabled, boards.updateCoverImage);
router.delete("/:_id/cover-image", isLoggedIn, isBoardEnabled, boards.deleteCoverImage);

// 멤버 관리 (초대 기반)
router.get("/:_id/members/list", isLoggedIn, isBoardEnabled, boards.findMemberList);
router.post("/:_id/members/users", isLoggedIn, isBoardEnabled, boards.addMemberUser);
router.delete("/:_id/members/users", isLoggedIn, isBoardEnabled, boards.removeMemberUser);
router.delete("/:_id/leave", isLoggedIn, isBoardEnabled, boards.leaveBoard);

// 작성자 관리
router.post("/:_id/writers/users", isLoggedIn, isBoardEnabled, boards.addWriterUser);
router.delete("/:_id/writers/users", isLoggedIn, isBoardEnabled, boards.removeWriterUser);

export { router };
