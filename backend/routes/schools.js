const express = require('express');
const router = express.Router();
const school = require("../controllers/school");
const {isAdManager}=require('../middleware/auth')

//=================================
//             School
//=================================

router.post('/',isAdManager,school.validateCreate,school.create);
router.get('/list',isAdManager,school.list);
router.put('/:_id',isAdManager,school.update)
router.delete('/:_id',isAdManager,school.delete);

router.post('/:_id/classrooms',isAdManager,school.createClassroom);
router.put('/:_id/classrooms/:idx',isAdManager,school.updateClassroom);
router.delete('/:_id/classrooms/:idx',isAdManager,school.deleteClassroom);

router.post('/:_id/subjects',isAdManager,school.createSubject);
router.put('/:_id/subjects/:idx',isAdManager,school.updateSubject);
router.delete('/:_id/subjects/:idx',isAdManager,school.deleteSubject);

router.post('/:_id/seasons',isAdManager,school.createSeason);
router.put('/:_id/seasons/:idx',isAdManager,school.updateSeason);
router.delete('/:_id/seasons/:idx',isAdManager,school.deleteSeason);

// user enter school => create schoolUser
// router.post('/enter',isAdmin,school.validateCreateMultiple,school.)

module.exports = router;