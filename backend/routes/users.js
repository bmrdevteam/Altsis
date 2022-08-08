const express = require('express');
const router = express.Router();
const user = require("../controllers/user");
const {isLoggedIn,isNotLoggedIn,isOwner,isAdmin,isAdManager}=require("../middleware/auth");

//=================================
//             User
//=================================

/* local & google login */
router.post('/login/local',isNotLoggedIn,user.loginLocal);
router.post("/login/google",isNotLoggedIn,user.loginGoogle);

/* connect to social account */
router.post('/google',isLoggedIn,user.connectGoogle);
router.delete('/google',isLoggedIn,user.disconnectGoogle);

/* logout */
router.get("/logout", isLoggedIn,user.logout);

//CRUD 
router.post('/owners',isOwner,user.validateOwner,user.createOwner);
router.post('/members',isAdManager,user.validateMembers,user.createMembers);

// admin appoints member as manager
router.patch('/managers/:_id',isAdmin,user.appointManager);
router.delete('/managers/:_id',isAdmin,user.cancelManager);

// admin&manager read user list
router.get('/list',isAdManager,user.readUsers);

// admin&mnanger update member
router.put('/:_id/:field',isAdManager,user.validateUpdate,user.updateMember);

// owner, admin,manager, member read & update oneself
router.get('/',isLoggedIn,user.read);
router.put('/:field',isLoggedIn,user.update);


// admin&manager delete member
router.delete('/members/:_id',isAdManager,user.deleteMember);

module.exports = router;