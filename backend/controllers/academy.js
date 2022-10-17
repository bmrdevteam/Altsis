const { addConnection, deleteConnection } = require("../databases/connection");
const { User, Academy } = require("../models/models");

module.exports.create = async (req, res) => {
  try {
    /* check duplication */
    const exAcademy = await Academy.findOne({ academyId: req.body.academyId });
    if (exAcademy)
      return res.status(409).send({
        message: `academyId '${exAcademy.academyId}'is already in use`,
      });

    /* create academy document & check validation */
    const academy = new Academy(req.body);
    if (!academy.checkValidation())
      return res.status(400).send({ message: "validation failed" });

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
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    /* if user is admin/magager/member of academy: return full info */
    if (req.params._id) {
      if (!req.isAuthenticated()) return res.status(401).send();

      const academy = await Academy.findById(req.params._id);

      if (req.user.auth == "owner") {
        return res.status(200).send(academy);
      }
      if (req.user.dbName != academy.dbName) return res.status(401).send();
      delete academy.dbName;
      return res.status(200).send(academy);
    }
    /* if user is owner: return full info */
    if (req.isAuthenticated() && req.user.auth == "owner") {
      const academies = await Academy.find(req.query);
      return res.status(200).send({ academies });
    }
    /* else: return filtered info */
    const academies = await Academy.find(req.query).select([
      "academyId",
      "academyName",
    ]);
    return res.status(200).send({ academies });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateField = async (req, res) => {
  try {
    if (["email", "tel"].indexOf(req.params.field) == -1)
      return res.status(400).send();

    /* find document */
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    academy[req.params.field] = req.body.new;
    if (!academy.checkValidation(req.params.field))
      return res.status(400).send({ message: "validation failed" });

    await academy.save();
    return res.status(200).send(academy);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.remove = async (req, res) => {
  try {
    /* find document */
    const academy = await Academy.findById(req.params._id);
    if (!academy) return res.status(404).send({ message: "academy not found" });

    /* delete document */
    academy.remove();

    /* delete db */
    await deleteConnection(academy.dbName);
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
