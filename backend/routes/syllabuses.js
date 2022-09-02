const express = require("express");
const router = express.Router();
const syllabus = require("../controllers/syllabus");
const { isAdmin, isLoggedIn } = require("../middleware/auth");

//=================================
//             Syllabus
//=================================

router.post("/", isLoggedIn, syllabus.create);

router.get("/classrooms", isLoggedIn, syllabus.classrooms);
router.get("/time", isLoggedIn, syllabus.time);

router.get("/list", isLoggedIn, syllabus.list);
router.get("/:_id", isLoggedIn, syllabus.read);
router.get("/:_id/students", isLoggedIn, syllabus.students);

router.put("/:_id/confirmed", isLoggedIn, syllabus.confirm);
router.put("/:_id/:field?", isLoggedIn, syllabus.update);
router.delete("/:_id", isLoggedIn, syllabus.delete);

module.exports = router;
