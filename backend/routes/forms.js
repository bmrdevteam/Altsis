const express = require("express");
const router = express.Router();
const forms = require("../controllers/forms");
const { isAdManager } = require("../middleware/auth");

//=================================
//             Form
//=================================

router.post("/", isAdManager, forms.create);
router.get("/:_id?", isAdManager, forms.find);
router.put("/:_id/:field?", isAdManager, forms.update);
router.delete("/:_id", isAdManager, forms.remove);

module.exports = router;
