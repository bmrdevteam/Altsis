const _ = require("lodash");
const School = require("../models/School");

/* create */

module.exports.create = async (req, res) => {
  try {
    const _School = School(req.user.dbName);

    /* check duplication */
    const exSchool = await _School.findOne({ schoolId: req.body.schoolId });
    if (exSchool) {
      return res
        .status(409)
        .send({ message: `schoolId ${req.body.schoolId} is already in use` });
    }

    /* create and save document */
    const school = new _School(req.body);
    await school.save();
    return res.status(200).send(school);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    if (req.params._id) {
      const school = await School(req.user.dbName).findById(req.params._id);
      // const seasons = await Season(req.user.dbName).find({schoolId:school.schoolId});
      const seasons = [
        { year: "2022학년도", term: "1쿼터" },
        { year: "2022학년도", term: "2쿼터" },
      ];
      return res
        .status(200)
        .send(_.merge(school.toObject(), { seasons: seasons }));
    }
    const schools = (await School(req.user.dbName).find({})).map((school) => {
      return {
        _id: school._id,
        schoolId: school.schoolId,
        schoolName: school.schoolName,
      };
    });
    return res.status(200).send(schools);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateSubjects = async (req, res) => {
  try {
    const school = await School(req.user.dbName).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: "school not found" });
    }
    school.subjects = req.body.new;
    await school.save();
    return res.status(200).send(school);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateClassrooms = async (req, res) => {
  try {
    const school = await School(req.user.dbName).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: "school not found" });
    }
    school.classrooms = req.body.new;
    await school.save();
    return res.status(200).send(school);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateFormArchive = async (req, res) => {
  try {
    const school = await School(req.user.dbName).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: "school not found" });
    }
    school.formArchive = req.body.new;
    await school.save();
    return res.status(200).send(school);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/* delete */

exports.delete = async (req, res) => {
  try {
    await School(req.user.dbName).findByIdAndDelete(req.params._id);
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
