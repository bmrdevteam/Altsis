const express = require('express');
const router = express.Router();
const school = require("../controllers/school");
const {isAdmin}=require('../middleware/auth')

//=================================
//             School
//=================================

router.post('/',isAdmin,school.create);
router.get('/',isAdmin,school.read);
router.patch('/',isAdmin,school.update)
router.delete('/',isAdmin,school.delete);

module.exports = router;