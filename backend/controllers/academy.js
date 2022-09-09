const mongoose = require("mongoose");

const {
  conn,
  addConnection,
  deleteConnection,
} = require("../databases/connection");
const config = require("../config/config");
const { User, Academy } = require("../models/models");

exports.create = async (req, res) => {
  try {
    /* check duplication */
    const exAcademy = await Academy.findOne({ academyId: req.body.academyId });
    if (exAcademy) {
      return res.status(409).send({
        message: `academyId '${exAcademy.academyId}'is already in use`,
      });
    }

    /* create academy document & check validation */
    const academy = new Academy(req.body);
    if (!Academy.checkValidation(academy)) {
      return res.status(400).send({ message: "validation failed" });
    }

    /* save academy document */
    await academy.save();

    /* create db */
    const newConn = mongoose.createConnection(config["url"](academy.dbName));
    addConnection({ dbName: academy.dbName, newConn });

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
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.list = async (req, res) => {
  try {
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
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    /* find document */
    const academy = await Academy.findById(req.params._id);
    if (!academy) {
      return res.status(404).send({ message: "academy not found" });
    }

    /* update document */
    academy[req.params.field] = req.body.new;

    /* if updated filed is adminId, find admin and update adminName */
    if (req.params.field == "adminId") {
      const admin = await User(academy.dbName).findOne({
        userId: academy.adminId,
      });
      if (!admin) {
        return res.status(404).send({ message: "admin not found" });
      }
      academy.adminName = admin.userName;
    }

    /* save document */
    await academy.save();
    return res.status(200).send({ academy });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    /* find document */
    const academy = await Academy.findById(req.params._id);
    if (!academy) {
      return res.status(404).send({ message: "not found academy" });
    }

    /* delete document */
    academy.remove();

    /* delete db */
    await conn[academy.dbName].db.dropDatabase();
    deleteConnection(academy.dbName);
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
