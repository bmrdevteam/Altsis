const express = require('express');
const router = express.Router();
const academy = require("../controllers/academy");
const {isOwner}=require('../middleware/auth')

//=================================
//             Academy
//=================================

router.post('/',isOwner,academy.create);
router.get('/',isOwner,academy.read);
router.patch('/',isOwner,academy.update)
router.delete('/',isOwner,academy.delete);

module.exports = router;