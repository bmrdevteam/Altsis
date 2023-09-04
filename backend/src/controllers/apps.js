import { logger } from "../log/logger.js";
import _ from "lodash";
import { Apps, School, User } from "../models/index.js";

/* create */
export const create = async (req, res) => {
  try {
    const user = await User(req.user.academyId).findOne({
      userId: req.user.userId,
    });
    if (!user) return res.status(404).send();

    const _Apps = Apps(req.user.academyId);

    // /* check duplication */
    const exApps = await _Apps.findOne({
      title: req.body.title,
    });

    if (exApps) return res.status(409).send({ message: `apps already exists` });

    /* create and save document */
    const apps = new _Apps({
      title: req.body.title,
      description: req.body.description,
    });
    await apps.save();
    return res.status(200).send(apps);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const find = async (req, res) => {
  try {
    const apps = await Apps(req.user.academyId).find({});
    if (!apps) return res.status(404).send({ message: "apps not found" });
    // apps.clean(); //DEVELOPMENT MODE
    return res.status(200).send(apps);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const findById = async (req, res) => {
  try {
    const apps = await Apps(req.user.academyId).findById(req.params._id);
    if (!apps) return res.status(404).send({ message: "apps not found" });
    // apps.clean(); //DEVELOPMENT MODE
    return res.status(200).send(apps);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const updateDataField = async (req, res) => {
  try {
    const apps = await Apps(req.user.academyId).findById(req.params._id);
    if (!apps) return res.status(404).send({ message: "apps not found" });

    const field = req.params.field;
    apps.data[field] = req.body.new;
    await apps.save();
    return res.status(200).send(apps);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/* delete */

export const remove = async (req, res) => {
  try {
    const apps = await Apps(req.user.academyId).findById(req.params._id);
    if (!apps) return res.status(404).send({ message: "apps not found" });
    await apps.delete();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
