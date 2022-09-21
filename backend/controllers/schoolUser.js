const SchoolUser = require("../models/SchoolUser");
const _ = require("lodash");
const mongoose = require("mongoose");
const { wrapWithErrorHandler } = require("../utils/errorHandler");

const register = async (req, res) => {
  const { _id, year, term, info } = req.body;

  const schoolUser = await SchoolUser(req.user.dbName).findById(
    mongoose.Types.ObjectId(_id)
  );
  if (!schoolUser) {
    res.status(404).send({ message: "no schoolUser!" });
  }
  const { yearIdx, termIdx } = schoolUser.findRegistrationIdx(year, term);
  if (yearIdx == -1) {
    schoolUser["registrations"].push({
      year,
      terms: [term],
      info,
    });
  } else if (termIdx == -1) {
    schoolUser["registrations"][yearIdx]["terms"].push(term);
  } else {
    return res
      .status(409)
      .send({ message: "schoolUser already registered in this term" });
  }

  schoolUser.markModified("registrations");
  await schoolUser.save();
  return res.status(200).send({ schoolUser });
};

const registerBulk = async (req, res) => {
  const { year, term, schoolUsers } = req.body;

  const updatedSchoolUsers = await Promise.all(
    schoolUsers.map(async (_schoolUser) => {
      const schoolUser = await SchoolUser(req.user.dbName).findById(
        mongoose.Types.ObjectId(_schoolUser._id)
      );
      if (!schoolUser) {
        const error = new Error(`no schooluser(_id:${_schoolUser._id}`);
        error.code = 404;
        throw error;
      }

      const { yearIdx, termIdx } = schoolUser.findRegistrationIdx(year, term);
      if (yearIdx == -1) {
        schoolUser["registrations"].push({
          year,
          terms: [term],
          info: _schoolUser.info,
        });
      } else if (termIdx == -1) {
        schoolUser["registrations"][yearIdx]["terms"].push(term);
      } else {
        const error = new Error("schoolUser already registered in this term");
        error.code = 409;
        throw error;
      }
      return schoolUser;
    })
  );
  await Promise.all(
    updatedSchoolUsers.map((schoolUser) => {
      schoolUser.save();
    })
  );
  return res.status(200).send({ schoolUsers: updatedSchoolUsers });
};

const read = async (req, res) => {
  const schoolUser = await SchoolUser(req.user.dbName).findById(req.params._id);
  return res.status(200).send({ schoolUser });
};

const getAll = async (req, res) => {
  const schoolUsers = await SchoolUser(req.user.dbName).find({});
  return res.status(200).send({ schoolUsers });
};

const update = async (req, res) => {
  const schoolUser = await SchoolUser(req.user.dbName).findById(req.params._id);
  if (!schoolUser) {
    return res.status(404).send({ message: "no schooluser!" });
  }

  const fields = ["role", "photo", "archive"];
  if (req.params.field) {
    if (fields.includes(req.params.field)) {
      schoolUser[req.params.field] = req.body.new;
    } else {
      return res.status(400).send({
        message: `field '${req.params.field}' does not exist or cannot be updated`,
      });
    }
  } else {
    fields.forEach((field) => {
      schoolUser[field] = req.body.new[field];
    });
  }

  await schoolUser.save();
  return res.status(200).send({ schoolUser });
};

const updateRegistration = async (req, res) => {
  const schoolUser = await SchoolUser(req.user.dbName).findById(req.params._id);
  if (!schoolUser) {
    return res.status(404).send({ message: "no schoolUser!" });
  }

  // update every registration
  if (!req.params.yearIdx) {
    schoolUser["registrations"] = req.body.new;
  } else if (schoolUser["registrations"].length < req.params.yearIdx) {
    return res.status(409).send({ message: "index out of range" });
  } else {
    // update year Info
    schoolUser["registrations"][req.params.yearIdx] = req.body.new;
  }
  await schoolUser.save();
  return res.status(200).send({ schoolUser });
};

const cancelRegistration = async (req, res) => {
  const schoolUser = await SchoolUser(req.user.dbName).findById(req.params._id);
  const { yearIdx, termIdx } = schoolUser.findRegistrationIdx(year, term);
  if (yearIdx == -1 || termIdx == -1) {
    return res.status(404).send({ message: "not existing season" });
  } else if (termIdx == 0) {
    schoolUser["registrations"].splice(yearIdx, 1);
  } else {
    schoolUser["registrations"][yearIdx]["terms"].splice(termIdx, 1);
  }
  schoolUser.markModified("registrations");
  await schoolUser.save();
  return res.status(200).send({ schoolUser });
};

module.exports = wrapWithErrorHandler({
  register,
  registerBulk,
  read,
  getAll,
  update,
  updateRegistration,
  cancelRegistration,
});
