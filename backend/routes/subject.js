const express = require('express');
const router = express.Router();
const subject = require("../controllers/subject");
const {isAdmin}=require('../middleware/auth')

//=================================
//             Subject
//=================================

router.post('/',isAdmin,subject.create);
router.get('/',isAdmin,subject.read);
router.patch('/',isAdmin,subject.update)
router.delete('/',isAdmin,subject.delete);

module.exports = router;