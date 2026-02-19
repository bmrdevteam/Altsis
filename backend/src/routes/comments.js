import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as comments from "../controllers/comments.js";

// 댓글 CRUD
router.post("/", isLoggedIn, comments.create);
router.get("/counts", isLoggedIn, comments.findCounts);
router.get("/", isLoggedIn, comments.find);
router.put("/:_id", isLoggedIn, comments.update);
router.delete("/:_id", isLoggedIn, comments.remove);

export { router };
