const express = require("express");
const router = express.Router();
const _ = require("lodash");
const client = require("../caches/redis");
const Archive = require("../models/Archive");
const Registration = require("../models/Registration");
const Season = require("../models/Season");
const User = require("../models/User");

router.get("/db", async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "hello world! this is db/test",
  });
});

router.post("/archives", async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "hello world! this is /archives",
  });
});

router.get("/test1", (req, res) => {
  res.status(200).json({
    success: true,
    message: "hello world! this is test1",
  });
});

router.post("/redis", (req, res) => {
  client.set(req.body.key, req.body.value);
  return res.status(200).send({ success: true });
});

router.get("/redis", (req, res) => {
  client.keys("*", (err, keys) => {
    return res.status(200).send({ keys });
  });
});

router.delete("/redis/all", (req, res) => {
  client.keys("*", (err, keys) => {
    keys.map((key) => {
      client.del(key);
    });
    return res.status(200).send({ success: true });
  });
});

router.delete("/redis/:key", (req, res) => {
  console.log("key: ", req.params.key);
  client.del(req.params.key);
  return res.status(200).send({ success: true });
});

module.exports = router;
