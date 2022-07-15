const express = require('express');
const router = express.Router();
const user = require("../controllers/user");
const {isLoggedIn,isNotLoggedIn}=require("../middleware/auth");

//=================================
//             User
//=================================

/* local & google login */
router.post('/login/local',isNotLoggedIn,user.localLogin);
router.post("/login/google",isNotLoggedIn,user.googleLogin);

/* logout */
router.get("/logout", isLoggedIn,user.logout);

/* get logged in user info */
router.get('/info',isLoggedIn,user.info);

module.exports = router;