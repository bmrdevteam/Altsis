import express from "express";
const router = express.Router();
import { isLoggedIn } from "../middleware/auth.js";
import * as courses from "../controllers/courses.js";

//=================================
//             Syllabus & Enrollments
//=================================

router.get("/", isLoggedIn, courses.find);
export { router };
