const express = require("express");
const router = express.Router();
const courses = require("../controllers/courses");
const { isLoggedIn } = require("../middleware/auth");

//=================================
//             Syllabus & Enrollments
//=================================

router.get("/", isLoggedIn, courses.find);
module.exports = router;
