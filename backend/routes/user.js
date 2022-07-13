const express = require('express');
const router = express.Router();
const user = require("../controllers/user");
const {isLoggedIn,isNotLoggedIn}=require("../middleware/auth");

//=================================
//             User
//=================================

/* local login & register */
router.post('/login',isNotLoggedIn,user.login);
router.post("/register",isNotLoggedIn,user.localValidate, user.register);

/* google login & register */
router.post('/google/auth',isNotLoggedIn,user.googleAuth); 
router.post('/google/register', isNotLoggedIn,user.googleValidate,user.googleRegister); 

/* local & google logout */
router.get("/logout", isLoggedIn,user.logout);

/* get logged in user info */
router.get('/info',isLoggedIn,user.info);

module.exports = router;