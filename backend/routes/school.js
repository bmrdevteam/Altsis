const express = require('express');
const router = express.Router();
const school = require("../controllers/school");
const {isAdmin}=require('../middleware/auth')

//=================================
//             Academy
//=================================

router.post('/create',isAdmin,school.create);
router.get('/read',isAdmin,school.read);
router.patch('/update',isAdmin,school.update)
router.delete('/delete',isAdmin,school.delete);

module.exports = router;