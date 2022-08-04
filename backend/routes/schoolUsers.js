const express = require('express');
const router = express.Router();
const schoolUser = require("../controllers/schoolUser");
const {isLoggedIn,isAdManager}=require("../middleware/auth");

// register schoolUser (not common register!)
router.post('/register',isAdManager,schoolUser.register);
router.put('/:_id/:field',isAdManager,schoolUser.update);
router.delete('/:_id/registration',isAdManager,schoolUser.deleteRegistration);

router.get('/list',isAdManager,schoolUser.list);
router.get('/:_id',isAdManager,schoolUser.read);


router.put('/:_id/:field',isAdManager,schoolUser.update);

module.exports = router;