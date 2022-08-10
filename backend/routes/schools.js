const express = require('express');
const router = express.Router();
const school = require("../controllers/school");
const {isAdManager}=require('../middleware/auth')

//=================================
//             School
//=================================

router.post('/',isAdManager,school.validateCreate,school.create);
router.get('/list',isAdManager,school.list);
router.put('/:_id/info/:field?',isAdManager,school.update)
router.delete('/:_id',isAdManager,school.delete);

// ________________________________________
// ---- classrooms, subjects, seasons ----
// ________________________________________

router.post('/:_id/:field',isAdManager,school.createField);
router.put('/:_id/:field',isAdManager,school.updateField);
router.put('/:_id/:field/:idx',isAdManager,school.updateFieldByIdx);
router.delete('/:_id/:field/:idx',isAdManager,school.deleteFieldByIdx);

module.exports = router;