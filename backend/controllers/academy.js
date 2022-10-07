const mongoose = require("mongoose");

const { addConnection, deleteConnection } = require("../databases/connection");
const { User, Academy } = require("../models/models");

module.exports.create = async (req, res) => {
  /* check duplication */
  const exAcademy = await Academy.findOne({ academyId: req.body.academyId });
  if (exAcademy) {
    return res.status(409).send({
      message: `academyId '${exAcademy.academyId}'is already in use`,
    });
  }

  /* create academy document & check validation */
  const academy = new Academy(req.body);
  if (!academy.checkValidation()) {
    return res.status(400).send({ message: "validation failed" });
  }

  /* save academy document */
  await academy.save();

  /* create db */
  addConnection(academy.dbName);

  /* create & save admin document  */
  const _User = User(academy.dbName);
  const password = _User.generatePassword();
  const admin = new _User({
    userId: academy.adminId,
    userName: academy.adminName,
    academyId: academy.academyId,
    academyName: academy.academyName,
    password,
    auth: "admin",
  });
  await admin.save();

  admin["password"] = password;
  return res.status(200).send({
    academy,
    admin,
  });
};

module.exports.find = async (req, res) => {
  const academies = await Academy.find({});
  /* if user is owner: return full info */
  if (req.isAuthenticated() && req.user.auth == "owner") {
    return res.status(200).send({ academies });
  }
  /* else: return filtered info */
  return res.status(200).send({
    academies: academies.map((academy) => {
      return {
        academyId: academy.academyId,
        academyName: academy.academyName,
      };
    }),
  });
};

module.exports.updateEmail = async (req, res) => {
  /* find document */
  const academy = await Academy.findById(req.params._id);
  if (!academy) {
    return res.status(404).send({ message: "academy not found" });
  }
  academy.email = req.body.new;
  if (!academy.checkValidation("email")) {
    return res.status(400).send({ message: "validation failed" });
  }
  await academy.save();
  return res.status(200).send({ academy });
};

module.exports.updateTel = async (req, res) => {
  /* find document */
  const academy = await Academy.findById(req.params._id);
  if (!academy) {
    return res.status(404).send({ message: "academy not found" });
  }
  academy.tel = req.body.new;
  if (!academy.checkValidation("tel")) {
    return res.status(400).send({ message: "validation failed" });
  }
  await academy.save();
  return res.status(200).send({ academy });
};

module.exports.delete = async (req, res) => {
  /* find document */
  const academy = await Academy.findById(req.params._id);
  if (!academy) {
    return res.status(404).send({ message: "academy not found" });
  }
  /* delete document */
  academy.remove();

  /* delete db */
  await deleteConnection(academy.dbName);
  return res.status(200).send();
};
