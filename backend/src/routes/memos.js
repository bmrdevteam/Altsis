import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as memo from "../controllers/memos.js";

router.post("/", isLoggedIn, memo.create);
router.put("/:_id", isLoggedIn, memo.update);
router.delete("/:_id", isLoggedIn, memo.remove);

export { router };
