const express = require('express');
const router = express.Router();
const registration = require("../controllers/registration");
const {isAdmin, isLoggedIn}=require('../middleware/auth')

//=================================
//             Registration
//=================================

router.post('/',isLoggedIn,registration.create);
router.get('/',isLoggedIn,registration.read);
router.patch('/',isLoggedIn,registration.update)
router.delete('/',isLoggedIn,registration.delete);

module.exports = router;