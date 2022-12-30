const express = require("express");
const router = express.Router();
const { isOwner } = require("../middleware/auth");

const academies = require("../controllers/academies");
const users = require("../controllers/users");
const schools = require("../controllers/schools");
const seasons = require("../controllers/seasons");
const registrations = require("../controllers/registrations");

//=================================
//             Academy
//=================================

router.post("/", isOwner, academies.create);
router.post("/:academyId/activate", isOwner, academies.activate);
router.post("/:academyId/inactivate", isOwner, academies.inactivate);
router.get("/:academyId?", academies.find);

// update academy email, tel
router.put("/:academyId", isOwner, academies.updateField);
router.delete("/:academyId", isOwner, academies.remove);

/* get/delete documents */
router.get("/:academyId/users/:_id?", isOwner, users.find);
router.get("/:academyId/:docType/:docId?", isOwner, academies.findDocuments);
router.delete(
  "/:academyId/:docType/:docId?",
  isOwner,
  academies.deleteDocument
);

/* create/update documents - users */
router.post("/:academyId/users", isOwner, users.create);
router.put("/:academyId/users/:_id/auth", isOwner, users.updateAuth);
router.put("/:academyId/users/:_id/schools", isOwner, users.updateSchools);
router.put("/:academyId/users/:_id", isOwner, users.update);

/* create/update documents - schools */
router.post("/:academyId/schools", isOwner, schools.create);
router.put(
  "/:academyId/schools/:_id/:field/:fieldType?",
  isOwner,
  schools.updateField
);

/* create/update documents - seasons */
router.post("/:academyId/seasons", isOwner, seasons.create);
router.post("/:academyId/seasons/:_id/activate", isOwner, seasons.activate);
router.post("/:academyId/seasons/:_id/inactivate", isOwner, seasons.inactivate);
router.put(
  "/:academyId/seasons/:_id/:field/:fieldType?",
  isOwner,
  seasons.updateField
);

/* create/update documents - registrations */
router.post("/:academyId/registrations", isOwner, registrations.register);
router.put("/:academyId/registrations/:_id", isOwner, registrations.update);

module.exports = router;
