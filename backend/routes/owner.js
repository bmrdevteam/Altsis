const express = require('express');
const router = express.Router();
const {isLoggedIn,isNotLoggedIn}=require("../middleware/auth");
const owner=require('../controllers/owner');

//=================================
//             Owner
//=================================

router.post('/login',isNotLoggedIn,owner.login);

// router.post('/login',isNotLoggedIn,owner.login);
// router.post('/google/auth',isNotLoggedIn,owner.googleAuth); 
// router.get("/logout", isLoggedIn,owner.logout);
// router.get('/info',isLoggedIn,owner.info);

module.exports = router;