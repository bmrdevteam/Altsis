const express = require("express");
const router = express.Router();
const syllabuses = require("../controllers/syllabuses");
const { isLoggedIn } = require("../middleware/auth");

//=================================
//             Syllabus
//=================================

router.post("/", isLoggedIn, syllabuses.create);
router.get("/:_id?", isLoggedIn, syllabuses.find);

router.put("/:_id/confirmed", isLoggedIn, syllabuses.confirm);
router.delete("/:_id/confirmed", isLoggedIn, syllabuses.unconfirm);

router.put("/:_id/time", isLoggedIn, syllabuses.updateTime);
router.put("/:_id/classroom", isLoggedIn, syllabuses.updateClassroom);
router.delete("/:_id/classroom", isLoggedIn, syllabuses.removeClassroom);
router.put("/:_id/:field?", isLoggedIn, syllabuses.update);

router.delete("/:_id", isLoggedIn, syllabuses.remove);

module.exports = router;
