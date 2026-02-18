import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";

import * as boardFavorites from "../controllers/boardFavorites.js";

// 즐겨찾기 CRUD
router.get("/", isLoggedIn, boardFavorites.find);
router.post("/", isLoggedIn, boardFavorites.create);
router.delete("/board/:boardId", isLoggedIn, boardFavorites.removeByBoard);
router.delete("/:_id", isLoggedIn, boardFavorites.remove);

export { router };
