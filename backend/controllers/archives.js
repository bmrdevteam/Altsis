const { Archive, User, School, Registration } = require("../models");
const ObjectId = require("mongoose").Types.ObjectId;

module.exports.find = async (req, res) => {
  try {
    let { user, school, registration } = req.query;

    if (registration) {
      if (!ObjectId.isValid(registration))
        return res
          .status(400)
          .send({ message: "registration(oid) is invalid" });

      const _registration = await Registration(req.user.academyId).findById(
        registration
      );
      if (!_registration)
        return res.status(404).send({ message: "registration not found" });

      user = _registration.user;
      school = _registration.school;
    }

    const _Archive = Archive(req.user.academyId);

    let archive = await _Archive.findOne({
      user,
      school,
    });
    if (!archive) {
      const _user = await User(req.user.academyId).findById(user);
      if (!_user) return res.status(404).send({ message: "user not found" });

      const _school = await School(req.user.academyId).findById(school);
      if (!_school)
        return res.status(404).send({ message: "school not found" });

      archive = new _Archive({
        user,
        userId: _user.userId,
        userName: _user.userName,
        school,
        schoolId: _school.schoolId,
        schoolName: _school.schoolName,
      });
      await archive.save();
    }

    return res.status(200).send(archive);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.update = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params._id)) return res.status(400).send();

    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) return res.status(404).send({ message: "archive not found" });

    archive.data = Object.assign(archive.data || {}, req.body);
    await archive.save();
    return res.status(200).send(archive);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
