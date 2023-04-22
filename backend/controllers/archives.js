const { logger } = require("../log/logger");
const { Archive, User, School, Registration, Season } = require("../models");
const ObjectId = require("mongoose").Types.ObjectId;
const _ = require("lodash");

module.exports.findByLabel = async (req, res) => {
  try {
    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) return res.status(404).send({});

    if (req.query?.label) {
      return res.status(200).send({
        archive: {
          data: { [req.query.label]: archive.data?.[req.query.label] },
        },
      });
    }
    return res.status(200).send({
      archive,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

module.exports.findByRegistration = async (req, res) => {
  try {
    if (!("registration" in req.query)) return res.status(400).send({});

    if (!ObjectId.isValid(req.query.registration))
      return res.status(400).send({ message: "registration(oid) is invalid" });

    const _registration = await Registration(req.user.academyId).findById(
      req.query.registration
    );
    if (!_registration)
      return res.status(404).send({ message: "registration not found" });

    const user = _registration.user;
    const school = _registration.school;

    let archive = await Archive(req.user.academyId).findOne({
      user,
      school,
    });
    if (!archive) {
      const _user = await User(req.user.academyId).findById(user);
      if (!_user) return res.status(404).send({ message: "user not found" });

      const _school = await School(req.user.academyId).findById(school);
      if (!_school)
        return res.status(404).send({ message: "school not found" });

      archive = new (Archive(req.user.academyId))({
        user,
        userId: _user.userId,
        userName: _user.userName,
        school,
        schoolId: _school.schoolId,
        schoolName: _school.schoolName,
      });
      await archive.save();
    }

    return res.status(200).send({ archive: { _id: archive._id } });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    let {
      user,
      school,
      registration,
      _id,
      registrationIds,
      label,
      registrationId,
    } = req.query;

    const _Archive = Archive(req.user.academyId);

    /* teacher request for students' archive */
    if (registrationIds && label) {
      const registrationIdList = _.split(registrationIds, ",");
      const registrations = await Promise.all(
        registrationIdList.map((_id) =>
          Registration(req.user.academyId).findById(_id).lean()
        )
      );
      const seasonIds = Array.from(
        new Set(
          registrations.map((registration) => registration.season.toString())
        )
      );
      if (seasonIds.length !== 1) {
        return res
          .status(409)
          .send({ message: "seasons of registrations not same" });
      }
      const teacherRegistration = await Registration(
        req.user.academyId
      ).findOne({
        season: seasonIds[0],
        user: req.user._id,
        role: "teacher",
      });
      if (!teacherRegistration) {
        return res
          .status(404)
          .send({ message: "teacher registration not found" });
      }

      const archives = [];
      for (let registration of registrations) {
        const archive = await Archive(req.user.academyId).findOne({
          school: registration.school,
          user: registration.user,
        });
        if (!archive) {
          archive = new _Archive({
            user: registration.user,
            userId: registration.userId,
            userName: registration.userName,
            school: registration.school,
            schoolId: registration.schoolId,
            schoolName: registration.schoolName,
          });
          // await archive.save();
          archives.push({
            ...registration,
            ...archive.toObject(),
            data: { [label]: archive.data?.[label] },
          });
        } else
          archives.push({
            ...registration,
            ...archive.toObject(),
            data: { [label]: archive.data?.[label] },
          });
      }
      return res.status(200).send({ archives });
    }
    /* teacher or student request for archive */
    if (registrationId && label) {
      const registration = await Registration(req.user.academyId)
        .findById(registrationId)
        .lean();
      if (!registration) {
        return res.status(404).send({ message: "registration not found" });
      }
      // if teacher ...
      if (!registration.user.equals(req.user._id)) {
        const teacherRegistration = await Registration(req.user.academyId)
          .findOne({
            season: registration.season,
            user: req.user._id,
            role: "teacher",
          })
          .lean();
        if (!teacherRegistration)
          return res
            .status(404)
            .send({ message: "teacher registration not found" });
      }

      const archive = await Archive(req.user.academyId).findOne({
        school: registration.school,
        user: registration.user,
      });
      if (!archive) {
        archive = new _Archive({
          user: registration.user,
          userId: registration.userId,
          userName: registration.userName,
          school: registration.school,
          schoolId: registration.schoolId,
          schoolName: registration.schoolName,
        });

        return res.status(200).send({
          ...registration,
          ...archive.toObject(),
          data: { [label]: archive.data?.[label] },
        });
      }
      return res.status(200).send({
        ...registration,
        ...archive.toObject(),
        data: { [label]: archive.data?.[label] },
      });
    }

    if (_id) {
      const archive = await _Archive.findById(_id);
      if (!archive) return res.status(404).send({});
      return res.status(200).send({ archive });
    }

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

    return res.status(200).send({ archive });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateBulk = async (req, res) => {
  try {
    /*

     label: string;
    archives: { _id: string; data: any }[];
    */
    if (!"label" in req.body || !"archives" in req.body) {
      return res
        .status(400)
        .send({ message: "label and archives are required in body" });
    }

    const archives = [];
    for (let _archive of req.body.archives) {
      if (!"_id" in _archive || !"data" in _archive) {
        return res
          .status(400)
          .send({ message: "_id and data are required in body" });
      }
      const archive = await Archive(req.user.academyId).findById(_archive._id);
      if (!archive)
        return res.status(404).send({ message: "archive not found" });

      archive.data = Object.assign(archive.data || {}, {
        [req.body.label]: _archive.data,
      });
      archives.push(archive);
    }

    await Promise.all(archives.map((archive) => archive.save()));
    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
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
    return res.status(200).send({ archive });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
