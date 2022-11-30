const express = require("express");
const router = express.Router();
const academy = require("../controllers/academy");
const { isOwner } = require("../middleware/auth");

//=================================
//             Academy
//=================================

router.post("/", isOwner, academy.create);
router.post("/:academyId/activate", isOwner, academy.activate);
router.post("/:academyId/inactivate", isOwner, academy.inactivate);
router.get("/:academyId?", academy.find);

// update email, tel
router.put("/:academyId", isOwner, academy.updateField);
router.delete("/:academyId", isOwner, academy.remove);

/* OWNER */
router.get("/:academyId/users/:user?", isOwner, academy.findUsers);
router.get("/:academyId/:docType/:docId?", isOwner, academy.findDocuments);
router.delete("/:academyId/:docType/:docId?", isOwner, academy.deleteDocument);

router.post("/:academyId/schools", isOwner, academy.createSchool);
router.post("/:academyId/seasons", isOwner, academy.createSeason);
router.post("/:academyId/users", isOwner, academy.createUser);
router.post("/:academyId/registrations", isOwner, academy.createRegistration);

router.put(
  "/:academyId/schools/:school/classrooms",
  isOwner,
  academy.updateClassrooms
);

router.put(
  "/:academyId/schools/:school/subjects",
  isOwner,
  academy.updateSubjects
);

router.put("/:academyId/seasons/:season", isOwner, academy.updateSeason);
router.put(
  "/:academyId/seasons/:season/permission/:permissionType",
  isOwner,
  academy.updateSeasonPermission
);
router.post(
  "/:academyId/seasons/:season/activate",
  isOwner,
  academy.activateSeason
);
router.post(
  "/:academyId/seasons/:season/inactivate",
  isOwner,
  academy.inactivateSeason
);

router.put("/:academyId/users/:user", isOwner, academy.updateUser);

module.exports = router;
