const _ = require("lodash");
const Registration = require("../models/Registration");
const User = require("../models/User");
const Season = require("../models/Season");

/* create */

module.exports.create = async (req, res) => {
  try {
    const _Registration = Registration(req.user.dbName);
    const { userId, schoolId, year, term } = req.body;

    console.log("debug: req.body is ", req.body);
    const [user, season, exRegistration] = await Promise.all([
      User(req.user.dbName).findOne({ userId }),
      Season(req.user.dbName).findOne({
        schoolId,
        year,
        term,
      }),
      _Registration.findOne({
        userId,
        schoolId,
        year,
        term,
      }),
    ]);
    if (!user) {
      return res.status(404).send({ message: "user not found" });
    }
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }

    /* check duplication */
    if (exRegistration) {
      return res.status(409).send({
        message: `registration(${req.body.userId},${req.body.schoolId},${req.body.year},${req.body.term}) is already in use`,
      });
    }

    /* create and save document */

    const registration = new _Registration(req.body);
    registration.userName = user.userName;
    registration.schoolName = season.schoolName;
    await registration.save();
    return res.status(200).send(registration);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    const _Registration = Registration(req.user.dbName);

    if (req.params._id) {
      const registration = await _Registration.findById(req.params._id);
      return res.status(200).send(registration);
    }

    const registrations = await _Registration.find(req.query);

    return res.status(200).send(registrations);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * update teacherId, teacherName
 * @param {*} req
 * @param {*} res
 * @returns
 */
module.exports.updateTeacher = async (req, res) => {
  try {
    const registration = await Registration(req.user.dbName).findById(
      req.params._id
    );
    if (!registration) {
      return res.status(404).send({ message: "registration not found" });
    }

    const teacherRegistration = await Registration(req.user.dbName).findOne({
      userId: req.body.new,
      schoolId: registration.schoolId,
      year: registration.year,
      term: registration.term,
      role: "teacher",
    });
    if (!teacherRegistration) {
      return res
        .status(404)
        .send({ message: "teacher  is not registered in this season" });
    }

    registration.teacherId = teacherRegistration.userId;
    registration.teacherName = teacherRegistration.userName;
    await registration.save();
    return res.status(200).send(registration);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * update role, grade, group
 * @param {*} req
 * @param {*} res
 * @returns
 */
module.exports.update = async (req, res) => {
  try {
    if (["grade", "group"].indexOf(req.params.field) == -1) {
      return res.status(409).send({ message: "field cannot be updated" });
    }
    const registration = await Registration(req.user.dbName).findById(
      req.params._id
    );
    if (!registration) {
      return res.status(404).send({ message: "registration not found" });
    }
    registration[req.params.field] = req.body.new;
    await registration.save();
    return res.status(200).send(registration);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};
/* delete */

exports.delete = async (req, res) => {
  try {
    await Registration(req.user.dbName).findByIdAndDelete(req.params._id);
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
