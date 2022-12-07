const express = require("express");
const router = express.Router();
const {
  isLoggedIn,
  isAdManager,
  forceNotLoggedIn,
} = require("../middleware/auth");
// const test = require("../controllers/test");
const { test } = require("../controllers");

router.post("/testdata", isLoggedIn, test.createTestData);
router.get("/testdata/:_id?", isLoggedIn, test.getTestData);
router.put("/testdata/:_id/:field", isLoggedIn, test.updateTestData);
router.delete("/testdata/:_id", isLoggedIn, test.removeTestData);

router.get("/db", test.db);

router.get("/test1", test.test1);

router.post("/redis", test.createRedis);

router.get("/redis", test.getRedis);

router.delete("/redis/:key", test.removeRedis);

module.exports = router;
