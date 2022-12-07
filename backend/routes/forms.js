const express = require("express");
const router = express.Router();
const form = require("../controllers/forms");
const { isAdManager } = require("../middleware/auth");

//=================================
//             Form
//=================================

router.post("/", isAdManager, form.create);
router.get("/:_id?", isAdManager, form.find);
router.put("/:_id/:field?", isAdManager, form.update);
router.delete("/:_id", isAdManager, form.remove);

module.exports = router;
