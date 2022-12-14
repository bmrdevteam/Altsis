const { addConnection, deleteConnection } = require("../databases/connection");
const {
  User,
  Academy,
  School,
  Season,
  Form,
  Registration,
} = require("../models");

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
    addConnection(academy.academyId, academy.dbName);

    /* create & save admin document  */
    const _User = User(academy.academyId);
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

    return res.status(200).send({
      adminPassword: password,
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.activate = async (req, res) => {
  try {
    /* find document */
    const academy = await Academy.findOne({ academyId: req.params.academyId });
    if (!academy) return res.status(404).send({ message: "academy not found" });

    /* activate academy */
    academy.isActivated = true;
    await academy.save();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.inactivate = async (req, res) => {
  try {
    /* find document */
    const academy = await Academy.findOne({ academyId: req.params.academyId });
    if (!academy) return res.status(404).send({ message: "academy not found" });

    /* activate academy */
    academy.isActivated = false;
    await academy.save();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    /* if one academy info is requested */
    if (req.params.academyId) {
      if (!req.isAuthenticated())
        return res.status(401).send({ message: "You are not logged in" });

      const academy = await Academy.findOne({
        academyId: req.params.academyId,
      }).select("-dbName");

      if (!academy) {
        return res.status(404).send({ message: "Academy not found" });
      }
      if (req.user.auth == "owner") {
        return res.status(200).send(academy);
      }

      if (req.user.academyId != academy.academyId)
        return res
          .status(401)
          .send({ message: "You are not a member of this academy" });

      if (!academy.isActivated) {
        return res.status(401).send({ message: "This academy is blocked." });
      }

      return res.status(200).send(academy);
    }

    /* if user is owner: return full info but exclude root */
    if (req.isAuthenticated() && req.user.auth == "owner") {
      const academies = await Academy.find({ academyId: { $ne: "root" } });
      return res.status(200).send({ academies });
    }
    /* else: return filtered info */
    const academies = await Academy.find({ isActivated: true }).select([
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
    /* find document */
    const academy = await Academy.findOne({
      academyId: req.params.academyId,
    });
    if (!academy) return res.status(404).send({ message: "academy not found" });

    academy["email"] = req.body.email;
    academy["tel"] = req.body.tel;
    await academy.save();
    return res.status(200).send(academy);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

const typeToModel = (docType, academyId) => {
  if (docType === "schools") return School(academyId);
  if (docType === "seasons") return Season(academyId);
  if (docType === "users") return User(academyId);
  if (docType === "registrations") return Registration(academyId);
  if (docType === "forms") return Form(academyId);
};

module.exports.findDocuments = async (req, res) => {
  try {
    if (req.params.docId) {
      const document = await typeToModel(
        req.params.docType,
        req.user.academyId
      ).findById(req.params.docId);
      return res.status(200).send(document);
    }

    const documents = await typeToModel(
      req.params.docType,
      req.user.academyId
    ).find(req.query);

    return res.status(200).send({ documents });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.deleteDocument = async (req, res) => {
  try {
    const document = await typeToModel(
      req.params.docType,
      req.user.academyId
    ).findById(req.params.docId);
    if (!document)
      return res.status(404).send({ message: "document not found" });

    await document.remove();

    return res.status(200).send();
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
    await deleteConnection(academy.academyId);
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
