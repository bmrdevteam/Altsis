const express = require('express');
const router = express.Router();
const season = require("../controllers/season");
const {isAdmin}=require('../middleware/auth')

//=================================
//             Season
//=================================

router.post('/',isAdmin,season.create);
router.get('/',isAdmin,season.read);
router.patch('/',isAdmin,season.update)
router.delete('/',isAdmin,season.delete);

module.exports = router;