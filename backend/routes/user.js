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
router.get("/logout", isLoggedIn,user.logout);

/* google login */
router.get('/google', isNotLoggedIn,
    passport.authenticate('google', { scope: ['profile', 'email'] })
); 
 
/* after google login */
router.get('/google/callback',
   passport.authenticate('google', 
   { failureRedirect: '/' }), 
   (req, res) => { res.status(200).send({success: true});},
);

module.exports = router;