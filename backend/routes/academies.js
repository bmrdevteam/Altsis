const express = require("express");
const router = express.Router();
const academy = require("../controllers/academy");
const { isOwner } = require("../middleware/auth");

//=================================
//             Academy
//=================================

router.post("/", isOwner, academy.create);
router.get("/", academy.find);

router.put("/:_id/email", isOwner, academy.updateEmail);
router.put("/:_id/tel", isOwner, academy.updateTel);

router.delete("/:_id", isOwner, academy.delete);

module.exports = router;
