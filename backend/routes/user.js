const express = require('express');
const router = express.Router();
const user = require("../controllers/user");
const {isLoggedIn,isNotLoggedIn,authorize}=require("../middleware/auth");

//=================================
//             User
//=================================

/* local & google login */
router.post('/login/local',isNotLoggedIn,user.localLogin);
router.post("/login/google",isNotLoggedIn,user.googleLogin);

/* logout */
router.get("/logout", isLoggedIn,user.logout);

/* get logged in user info */
router.get('/info',isLoggedIn,user.info); //necessary?

//CRUD - 나중에 권한 설정 할 것
router.post('/',authorize,user.validate,user.create);
router.get('/',authorize,user.read);
router.patch('/',authorize,user.optionalValidate,user.update);
router.delete('/',authorize,user.delete);

module.exports = router;