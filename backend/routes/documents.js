const express = require("express");
const router = express.Router();
const documents = require("../controllers/documents");
const { isLoggedIn } = require("../middleware/auth");

//=================================
//             Document
//=================================

router.get("/data", isLoggedIn, documents.findData);

module.exports = router;
