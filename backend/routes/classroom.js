const express = require('express');
const router = express.Router();
const classroom = require("../controllers/classroom");
const {isAdmin}=require('../middleware/auth')

//=================================
//             Classroom
//=================================

router.post('/',isAdmin,classroom.create);
router.get('/',isAdmin,classroom.read);
router.patch('/',isAdmin,classroom.update)
router.delete('/',isAdmin,classroom.delete);

module.exports = router;