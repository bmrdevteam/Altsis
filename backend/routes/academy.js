const express = require('express');
const router = express.Router();
const academy = require("../controllers/academy");
const {isOwner}=require('../middleware/auth')

//=================================
//             Academy
//=================================

router.post('/create',isOwner,academy.create);
router.get('/read',isOwner,academy.read);
router.patch('/update',isOwner,academy.update)
router.delete('/delete',isOwner,academy.delete);

module.exports = router;