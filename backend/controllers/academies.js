import { logger } from "../log/logger.js";
import { addConnection, deleteConnection } from "../_database/mongodb/index.js";
import {
  User,
  Academy,
  School,
  Season,
  Form,
  Registration,
} from "../models/index.js";

import _ from "lodash";
import { validate } from "../utils/validate.js";

export const create = async (req, res) => {
  try {
    /* validate */
    if (!Academy.isValid(req.body))
      return res.status(400).send({ message: "validation failed" });

    /* check duplication */
    const exAcademy = await Academy.findOne({ academyId: req.body.academyId });
    if (exAcademy)
      return res.status(409).send({
        message: `academyId '${exAcademy.academyId}'is already in use`,
      });

    /* create & save academy document & check validation */
    const academy = new Academy(req.body);
    await academy.save();

    /* create db */
    addConnection(academy);

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
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const find = async (req, res) => {
  try {
    /* if one academy info is requested */
    if (req.params.academyId) {
      if (!req.isAuthenticated())
        return res.status(401).send({ message: "You are not logged in" });

      const academy = await Academy.findOne({
        academyId: req.params.academyId,
      });

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
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const activate = async (req, res) => {
  try {
    /* find document */
    const academy = await Academy.findOne({ academyId: req.params.academyId });
    if (!academy) return res.status(404).send({ message: "academy not found" });

    /* activate academy */
    academy.isActivated = true;
    await academy.save();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const inactivate = async (req, res) => {
  try {
    /* find document */
    const academy = await Academy.findOne({ academyId: req.params.academyId });
    if (!academy) return res.status(404).send({ message: "academy not found" });

    /* activate academy */
    academy.isActivated = false;
    await academy.save();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    if (req.body.email && !validate("email", req.body.email))
      return res.status(400).send({ message: "validation failed" });
    if (req.body.tel && !validate("tel", req.body.tel))
      return res.status(400).send({ message: "validation failed" });

    /* find document */
    const academy = await Academy.findOne({
      academyId: req.params.academyId,
    });
    if (!academy) return res.status(404).send({ message: "academy not found" });

    academy["email"] = req.body.email || undefined;
    academy["tel"] = req.body.tel || undefined;
    await academy.save();
    return res.status(200).send(academy);
  } catch (err) {
    logger.error(err.message);
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

export const findDocuments = async (req, res) => {
  try {
    if (!_.find(["schools", "seasons", "users", "registrations", "forms"]))
      return res.status(400).send();

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
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    if (!_.find(["schools", "seasons", "users", "registrations", "forms"]))
      return res.status(400).send();

    const document = await typeToModel(
      req.params.docType,
      req.user.academyId
    ).findById(req.params.docId);
    if (!document)
      return res.status(404).send({ message: "document not found" });

    await document.remove();

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const remove = async (req, res) => {
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
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
