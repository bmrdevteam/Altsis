const express = require('express');
const router = express.Router();
const passport = require('passport');
const user = require("../controllers/user");
const {isLoggedIn,isLoggedOut}=require("../middleware/auth");

//=================================
//             User
//=================================

router.post("/register", user.validate, user.register);
router.post('/login',isLoggedOut,user.login);
router.post("/logout", isLoggedIn,user.logout);

module.exports = router;