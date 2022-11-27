const express = require("express");
const router = express.Router();
const academy = require("../controllers/academy");
const { isOwner } = require("../middleware/auth");

//=================================
//             Academy
//=================================

router.post("/", isOwner, academy.create);
router.post("/:_id/activate", isOwner, academy.activate);
router.post("/:_id/inactivate", isOwner, academy.inactivate);

router.get("/:_id?", academy.find);

// update email, tel
router.put("/:_id", isOwner, academy.updateField);

/* OWNER */
router.get("/:_id/users/:user?", isOwner, academy.findUsers);
router.get("/:_id/:docType/:docId?", isOwner, academy.findDocuments);
router.delete("/:_id/:docType/:docId?", isOwner, academy.deleteDocument);

router.post("/:_id/schools", isOwner, academy.createSchool);
router.post("/:_id/seasons", isOwner, academy.createSeason);
router.post("/:_id/users", isOwner, academy.createUser);
router.post("/:_id/registrations", isOwner, academy.createRegistration);

router.put(
  "/:_id/schools/:school/classrooms",
  isOwner,
  academy.updateClassrooms
);

router.put("/:_id/schools/:school/subjects", isOwner, academy.updateSubjects);

router.put("/:_id/seasons/:season", isOwner, academy.updateSeason);
router.post("/:_id/seasons/:season/activate", isOwner, academy.activateSeason);
router.post(
  "/:_id/seasons/:season/inactivate",
  isOwner,
  academy.inactivateSeason
);

router.put("/:_id/users/:user", isOwner, academy.updateUser);

router.delete("/:_id", isOwner, academy.remove);

module.exports = router;
