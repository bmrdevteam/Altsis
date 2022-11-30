const _ = require("lodash");
const { User, Registration, Season } = require("../models/models");

/* create */
module.exports.register = async (req, res) => {
  try {
    const _Registration = Registration(req.user.academyId);

    const [user, season, exRegistration] = await Promise.all([
      User(req.user.academyId).findOne({ userId: req.body.userId }),
      Season(req.user.academyId).findById(req.body.season),
      _Registration.findOne({
        season: req.body.season,
        userId: req.body.userId,
      }),
    ]);
    if (!user) return res.status(404).send({ message: "user not found" });

    if (!season) return res.status(404).send({ message: "season not found" });

    if (exRegistration)
      return res.status(409).send({ message: "user is already registered" });

    /* create and save document */
    const registration = new _Registration({
      ...season.getSubdocument(),
      userId: user.userId,
      userName: user.userName,
      role: req.body.role,
      grade: req.body.grade,
      group: req.body.group,
      teaches: req.body.teachers,
    });
    await registration.save();
    return res.status(200).send(registration);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.registerBulk = async (req, res) => {
  try {
    const season = await Season(req.user.academyId).findById(req.body.season);
    if (!season) {
      return res.status(404).send({ message: "season is not found" });
    }

    const registerations = [];
    const seasonSubdocument = season.getSubdocument();

    for (let user of req.body.users) {
      registerations.push({
        ...seasonSubdocument,
        userId: user.userId,
        userName: user.userName,
        role: user.role,
        grade: user.grade,
        group: user.group,
        teacherId: user.teacherId,
        teacherName: user.teacherName,
      });
    }
    const newRegistrations = await Registration(req.user.academyId).insertMany(
      registerations
    );
    return res.status(200).send({ registerations: newRegistrations });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    const registrations = await Registration(req.user.academyId).find(
      req.query
    );
    return res.status(200).send({ registrations });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

/**
 * update grade, group,teacherId,teacherName
 * @param {*} req
 * @param {*} res
 * @returns
 */
module.exports.update = async (req, res) => {
  try {
    if (
      ["grade", "group", "teacherId", "teacherName"].indexOf(
        req.params.field
      ) == -1
    )
      return res.status(409).send({ message: "field cannot be updated" });

    const registration = await Registration(req.user.academyId).findById(
      req.params._id
    );
    if (!registration)
      return res.status(404).send({ message: "registration not found" });

    registration[req.params.field] = req.body.new;
    await registration.save();
    return res.status(200).send(registration);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

/* delete */
exports.remove = async (req, res) => {
  try {
    const registration = await Registration(req.user.academyId).findById(
      req.params._id
    );
    if (!registration)
      return res.status(404).send({ message: "registration not found" });

    await registration.delete();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
