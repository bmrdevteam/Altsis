import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";
import * as documents from "../controllers/documents.js";

//=================================
//             Document
//=================================

router.get("/data", isLoggedIn, documents.findData);

export { router };
