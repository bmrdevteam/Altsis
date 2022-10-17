const express = require("express");
const router = express.Router();
const academy = require("../controllers/academy");
const { isOwner } = require("../middleware/auth");

//=================================
//             Academy
//=================================

router.post("/", isOwner, academy.create);
router.get("/:_id?", academy.find);

// update email, tel
router.put("/:_id/:field", isOwner, academy.updateField);

router.delete("/:_id", isOwner, academy.remove);

module.exports = router;
