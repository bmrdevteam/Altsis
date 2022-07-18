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

//CRUD - 나중에 권한 설정 할 것
router.post('/create',user.validate,user.create);
router.get('/read',user.validate,user.read);
router.patch('/update',user.validate,user.update)
router.delete('/delete',user.delete);

module.exports = router;