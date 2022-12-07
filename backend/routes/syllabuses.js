const express = require("express");
const router = express.Router();
const syllabus = require("../controllers/syllabuses");
const { isLoggedIn } = require("../middleware/auth");

//=================================
//             Syllabus
//=================================

router.post("/", isLoggedIn, syllabus.create);
router.get("/:_id?", isLoggedIn, syllabus.find);

router.put("/:_id/confirmed", isLoggedIn, syllabus.confirm);
router.delete("/:_id/confirmed", isLoggedIn, syllabus.unconfirm);

router.put("/:_id/time", isLoggedIn, syllabus.updateTime);
router.put("/:_id/classroom", isLoggedIn, syllabus.updateClassroom);
router.delete("/:_id/classroom", isLoggedIn, syllabus.removeClassroom);
router.put("/:_id/:field?", isLoggedIn, syllabus.update);

router.delete("/:_id", isLoggedIn, syllabus.remove);

module.exports = router;
