const express = require('express');
const router = express.Router();
const academy = require("../controllers/academy");
const {isOwner}=require('../middleware/auth')

//=================================
//             Academy
//=================================

router.post('/',isOwner,academy.validateCreate,academy.create);
router.get('/list',isOwner,academy.list);

router.put('/:_id/:field?',academy.validateUpdate,isOwner,academy.update);

router.delete('/:_id',isOwner,academy.delete);

module.exports = router;