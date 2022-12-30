const _ = require("lodash");
const { TestData } = require("../models");
const client = require("../caches/redis");
//_____________________________________________________________________________

module.exports.createTestData = async (req, res) => {
  try {
    const _TestData = TestData(req.user.academyId);
    const td = new _TestData(req.body);
    await td.save();
    return res.status(200).send(td);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.getTestData = async (req, res) => {
  try {
    if (req.params._id) {
      const td = await TestData(req.user.academyId).findById(req.params._id);
      return res.status(200).send(td);
    }

    const tds = await TestData(req.user.academyId).find(req.query);
    return res.status(200).send({ tds });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateTestData = async (req, res) => {
  try {
    const td = await TestData(req.user.academyId).findById(req.params._id);
    if (!td) return res.status(404).send({ message: "td not found" });

    td[req.params.field] = req.body.new;
    await td.save();
    return res.status(200).send(td);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.removeTestData = async (req, res) => {
  try {
    const td = await TestData(req.user.academyId).findById(req.params._id);
    if (!td) return res.status(404).send({ message: "td not found" });

    await td.remove();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

//_____________________________________________________________________________

module.exports.db = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "hello world! this is test/db",
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.test1 = (req, res) => {
  return res.status(200).send({
    message: "hello world! this is test/test1",
  });
};

module.exports.createRedis = async (req, res) => {
  await client.set(req.body.key, req.body.value);
  return res.status(200).send({ success: true });
};

module.exports.getRedis = (req, res) => {
  client.keys("*", (err, keys) => {
    return res.status(200).send({ keys });
  });
};
module.exports.removeRedis = async (req, res) => {
  await client.del(req.params.key);
  return res.status(200).send({ success: true });
};
