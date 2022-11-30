const express = require("express");
const router = express.Router();
const { isOwner } = require("../middleware/auth");

const academy = require("../controllers/academy");
const user = require("../controllers/user");
const school = require("../controllers/school");

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

/* get/delete academy documents*/
router.get("/:academyId/users/:_id?", isOwner, user.find);
router.get("/:academyId/:docType/:docId?", isOwner, academy.findDocuments);
router.delete("/:academyId/:docType/:docId?", isOwner, academy.deleteDocument);

/* create/update academy documents - users*/
router.post("/:academyId/users", isOwner, user.create);
// router.put("/:academyId/users/:user", isOwner, academy.updateUser);
router.put("/:academyId/users/:_id/auth", isOwner, user.updateAuth);
router.put("/:academyId/users/:_id/schools", isOwner, user.updateSchools);
router.put("/:academyId/users/:_id", isOwner, user.update);

/* create/update academy documents - schools*/
router.post("/:academyId/schools", isOwner, school.create);

router.put(
  "/:academyId/schools/:_id/:field/:fieldType?",
  isOwner,
  school.updateField
);

/* create/update academy documents - seasons*/
router.post("/:academyId/seasons", isOwner, academy.createSeason);

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

router.post("/:academyId/registrations", isOwner, academy.createRegistration);

module.exports = router;
