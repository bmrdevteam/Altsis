const express = require('express');
const router = express.Router();

const user = require("../controllers/user");
const { auth } = require("../middleware/auth");

//=================================
//             User
//=================================

router.post("/register", user.validate, user.register);
router.post("/login", user.login);
router.post("/logout", auth, user.logout);

module.exports = router;