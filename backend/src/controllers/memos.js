import { logger } from "../log/logger.js";
import _ from "lodash";

import { Registration } from "../models/index.js";
//_____________________________________________________________________________

export const create = async (req, res) => {
  try {
    const registration = await Registration(req.user.academyId).findById(
      req.body.registration
    );
    if (!registration) return res.status(404).send();
    if (!registration.user.equals(req.user._id)) return res.status(401).send();

    registration.memos.push({
      title: req.body.title,
      day: req.body.day,
      start: req.body.start,
      end: req.body.end,
      classroom: req.body.classroom,
      memo: req.body.memo,
    });
    await registration.save();
    return res.status(200).send({ memos: registration.memos });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const registration = await Registration(req.user.academyId).findById(
      req.body.registration
    );
    if (!registration)
      return res.status(404).send({ message: "registration not found" });
    if (!registration.user.equals(req.user._id)) return res.status(401).send();

    const idx = _.findIndex(registration.memos, (memo) =>
      memo._id.equals(req.params._id)
    );
    if (idx === -1)
      return res.status(404).send({
        message: "memo not found",
        memos: registration.memos,
        _id: req.params._id,
      });

    registration.memos[idx] = {
      title: req.body.title,
      day: req.body.day,
      start: req.body.start,
      end: req.body.end,
      memo: req.body.memo,
    };

    await registration.save();
    return res.status(200).send({ memos: registration.memos });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const registration = await Registration(req.user.academyId).findById(
      req.query.registration
    );
    if (!registration)
      return res.status(404).send({ message: "registration not found" });
    if (!registration.user.equals(req.user._id)) return res.status(401).send();

    const idx = _.findIndex(registration.memos, (memo) =>
      memo._id.equals(req.params._id)
    );
    if (idx === -1) return res.status(404).send({ message: "memo not found" });

    registration.memos.splice(idx, 1);
    await registration.save();
    return res.status(200).send({ memos: registration.memos });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
