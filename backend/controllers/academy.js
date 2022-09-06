const mongoose = require("mongoose");
const config = require("../config/config");
const {
  conn,
  addConnection,
  deleteConnection,
} = require("../databases/connection");
const Academy = require("../models/Academy");
const User = require("../models/User");

exports.create = async (req, res) => {
  try {
    // check duplication
    const _academy = await Academy.findOne({ academyId: req.body.academyId });
    if (_academy) {
      return res.status(400).send({ message: `academyId is already in use` });
    }

    // create academy document
    const academy = new Academy(req.body);
    await academy.save();

    // create academy DB
    const newConn = mongoose.createConnection(config["url"](academy.dbName));
    addConnection({ dbName: academy.dbName, newConn });

    // create admin document
    const _User = User(academy.dbName);
    const password = _User.generatePassword();
    const admin = new _User({
      userId: academy.adminId,
      userName: academy.adminName,
      password,
      auth: "admin",
      academyId: academy.academyId,
      academyName: academy.academyName,
    });
    await admin.save();
    admin["password"] = password;

    return res.status(200).send({
      academy,
      admin,
    });
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const academies = await Academy.find({});
    // if owner
    if (req.isAuthenticated() && req.user.auth == "owner") {
      return res.status(200).send({ academies });
    }
    return res.status(200).send({
      academies: academies.map((academy) => {
        return {
          academyId: academy.academyId,
          academyName: academy.academyName,
        };
      }),
    });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params._id);
    if (!academy) {
      return res.status(404).send({ message: "no academy!" });
    }

    academy[req.params.field] = req.body.new;

    if (!academy.validationCheck()) {
      return res.status(400).send({ message: "validation failed!" });
    }

    if (req.params.field == "adminId") {
      const admin = await User(academy.dbName).findOne({
        userId: academy.adminId,
      });
      if (!admin) {
        return res.status(404).send({ message: "no adimin!" });
      }
      academy["adminName"] = admin.userName;
    }
    await academy.save();
    return res.status(200).send({ academy });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const academy = await Academy.findById(req.params._id);
    if (!academy) {
      return res.status(404).send({ message: "no academy!" });
    }
    academy.remove();
    await conn[academy.dbName].db.dropDatabase();
    deleteConnection(academy.dbName);
    return res.status(200).send({ success: true });
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
