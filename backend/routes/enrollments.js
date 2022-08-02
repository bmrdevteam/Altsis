const express = require('express');
const router = express.Router();
const enrollment = require("../controllers/enrollment");
const {isAdmin, isLoggedIn}=require('../middleware/auth')

//=================================
//             Enrollment
//=================================

router.post('/:syllabus_id',isLoggedIn,enrollment.create);
router.get('/list',isLoggedIn,enrollment.list);
router.put('/:_id/evaluation',isLoggedIn,enrollment.updateEvaluation)
router.delete('/:_id',isLoggedIn,enrollment.delete);

module.exports = router;