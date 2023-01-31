const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware/auth");

const memo = require("../controllers/memos");

router.post("/", isLoggedIn, memo.create);
router.put("/:_id", isLoggedIn, memo.update);
router.delete("/:_id", isLoggedIn, memo.remove);

module.exports = router;
