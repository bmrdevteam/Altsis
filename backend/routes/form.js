const express = require('express');
const router = express.Router();
const form = require("../controllers/form");
const {isAdmin}=require('../middleware/auth')

//=================================
//             Form
//=================================

router.post('/',isAdmin,form.create);
router.get('/',isAdmin,form.read);
router.patch('/',isAdmin,form.update)
router.delete('/',isAdmin,form.delete);

module.exports = router;