const express = require('express');
const router = express.Router();
const syllabus = require("../controllers/syllabus");
const {isAdmin, isLoggedIn}=require('../middleware/auth')

//=================================
//             Syllabus
//=================================

router.post('/',isLoggedIn,syllabus.create);
router.get('/',isLoggedIn,syllabus.read);
router.patch('/',isLoggedIn,syllabus.update)
router.delete('/',isLoggedIn,syllabus.delete);

module.exports = router;