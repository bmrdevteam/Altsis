import express from "express";
const router = express.Router();
import { isLoggedIn, isAdManager } from "../middleware/auth.js";

import * as boards from "../controllers/boards.js";

// 게시판 CRUD
router.post("/", isAdManager, boards.create);
router.get("/:_id?", isLoggedIn, boards.find);
router.put("/:_id", isAdManager, boards.update);
router.delete("/:_id", isAdManager, boards.remove);

// 게시판 권한 관리
router.put("/:_id/permission/:type", isAdManager, boards.updatePermission);
router.post("/:_id/permission/:type/exceptions", isAdManager, boards.addPermissionException);
router.delete("/:_id/permission/:type/exceptions", isAdManager, boards.removePermissionException);

export { router };
