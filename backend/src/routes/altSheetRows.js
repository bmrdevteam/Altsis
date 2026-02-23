import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as altSheetRows from "../controllers/altSheetRows.js";

// 특수 경로 먼저
router.get("/my", isLoggedIn, altSheetRows.findMy);
router.post("/bulk", isLoggedIn, altSheetRows.createBulk);

// 일반 CRUD
router.post("/", isLoggedIn, altSheetRows.create);
router.get("/", isLoggedIn, altSheetRows.find);
router.put("/:_id", isLoggedIn, altSheetRows.update);
router.delete("/:_id", isLoggedIn, altSheetRows.remove);

export { router };
