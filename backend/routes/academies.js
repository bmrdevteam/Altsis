const express = require("express");
const router = express.Router();
const { isOwner } = require("../middleware/auth");

const academy = require("../controllers/academies");
const user = require("../controllers/users");
const school = require("../controllers/schools");
const season = require("../controllers/seasons");
const registration = require("../controllers/registrations");

//=================================
//             Academy
//=================================

router.post("/", isOwner, academy.create);
router.post("/:academyId/activate", isOwner, academy.activate);
router.post("/:academyId/inactivate", isOwner, academy.inactivate);
router.get("/:academyId?", academy.find);

// update academy email, tel
router.put("/:academyId", isOwner, academy.updateField);
router.delete("/:academyId", isOwner, academy.remove);

/* get/delete documents */
router.get("/:academyId/users/:_id?", isOwner, user.find);
router.get("/:academyId/:docType/:docId?", isOwner, academy.findDocuments);
router.delete("/:academyId/:docType/:docId?", isOwner, academy.deleteDocument);

/* create/update documents - users */
router.post("/:academyId/users", isOwner, user.create);
router.put("/:academyId/users/:_id/auth", isOwner, user.updateAuth);
router.put("/:academyId/users/:_id/schools", isOwner, user.updateSchools);
router.put("/:academyId/users/:_id", isOwner, user.update);

/* create/update documents - schools */
router.post("/:academyId/schools", isOwner, school.create);
router.put(
  "/:academyId/schools/:_id/:field/:fieldType?",
  isOwner,
  school.updateField
);

/* create/update documents - seasons */
router.post("/:academyId/seasons", isOwner, season.create);
router.post("/:academyId/seasons/:_id/activate", isOwner, season.activate);
router.post("/:academyId/seasons/:_id/inactivate", isOwner, season.inactivate);
router.put(
  "/:academyId/seasons/:_id/:field/:fieldType?",
  isOwner,
  season.updateField
);

/* create/update documents - registrations */
router.post("/:academyId/registrations", isOwner, registration.register);
router.put("/:academyId/registrations/:_id", isOwner, registration.update);

module.exports = router;
