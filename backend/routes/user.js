const express = require('express');
const router = express.Router();
const passport = require('passport');
const user = require("../controllers/user");
const {isLoggedIn,isNotLoggedIn,profileExists: profileExists}=require("../middleware/auth");

//=================================
//             User
//=================================

router.post("/register",isNotLoggedIn,user.validate, user.register);
router.post('/login',isNotLoggedIn,user.login);
router.get("/logout", isLoggedIn,user.logout);

/* google login */
router.get('/google/login', isNotLoggedIn,user.googleAuth); 
router.get('/google/callback',isNotLoggedIn,user.googleLogin);
router.get('/google/profile',user.getProfile);

module.exports = router;