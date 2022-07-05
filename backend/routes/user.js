const express = require('express');
const router = express.Router();
const passport = require('passport');
const user = require("../controllers/user");
const {isLoggedIn,isNotLoggedIn}=require("../middleware/auth");

//=================================
//             User
//=================================

router.post("/register",isNotLoggedIn,user.validate, user.register);
router.post('/login',isNotLoggedIn,user.login);
router.post("/logout", isLoggedIn,user.logout);

module.exports = router;