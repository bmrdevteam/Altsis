const _ = require("lodash");
const School = require("../models/School");

// utils

const _findById = async (dbName, _id) => {
  /* find school document */
  const school = await School(dbName).findById(_id);
  if (!school) {
    const err = new Error("school not found");
    err.status = 404;
    throw err;
  }
  return school;
};

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

module.exports.pushField = async (req, res) => {
  try {
    /* validaton */
    if (_.isEmpty(req.body.new)) {
      return res.status(409).send({ message: "body.new is null or empty" });
    }

    /* find school */
    const school = await _findById(req.user.dbName, req.params._id);

    const field = req.params.field;
    const val = req.body.new;

    /* check duplication */
    if (_.indexOf(school[field], val) != -1) {
      return res.status(409).send({
        message: `${field} '${val}' is already in the list`,
      });
    }

    /* push data */
    if (field === "subjects") {
      school[field]["data"].push(val);
    } else {
      school[field].push(val);
    }
    school.markModified(field);
    await school.save();

    return res.status(200).send({ school });
  } catch (err) {
    return res.status(err.status || 500).send({ err: err.message });
  }
};

/* read */

exports.list = async (req, res) => {
  try {
    /* find schools list */
    const schools = await School(req.user.dbName).find({});
    return res.status(200).send({ schools });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.read = async (req, res) => {
  try {
    /* find school */
    const school = await _findById(req.user.dbName, req.params._id);
    if (!req.params.field) {
      return res.status(200).send({ school });
    } else if (req.params.field === "classrooms") {
      return res.status(200).send({ classrooms: school.classrooms });
    } else if (req.params.field === "subjects") {
      return res.status(200).send({ subjects: school.subjects });
    } else if (req.params.field === "seasons") {
      return res.status(200).send({ seasons: school.seasons });
    } else if (req.params.field === "settings") {
      return res.status(200).send({ settings: school.settings });
    }
    return res.status(400).send();
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

/* update */

exports.update = async (req, res) => {
  try {
    /* find school document and get data */
    const school = await _findById(req.user.dbName, req.params._id);

    const fields = ["logo", "tel", "email", "head", "homepage", "address"];

    if (req.params.field) {
      if (fields.includes(req.params.field)) {
        school[req.params.field] = req.body.new;
      } else {
        return res.status(400).send({
          message: `field '${req.params.field}' does not exist or cannot be updated`,
        });
      }
    } else {
      fields.forEach((field) => {
        school[field] = req.body.new[field];
      });
    }
    await school.save();
    return res.status(200).send({ school });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.updateField = async (req, res) => {
  try {
    /* find school document and update */
    const school = await _findById(req.user.dbName, req.params._id);
    school[req.params.field] = req.body.new;
    school.markModified(req.params.field);
    await school.save();
    return res.status(200).send({ school });
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.updateFieldByIdx = async (req, res) => {
  try {
    /* find school document */
    const school = await _findById(req.user.dbName, req.params._id);

    if (school[req.params.field].length < req.params.idx) {
      return res.status(409).send({ message: "index out of range" });
    }

    if (req.params.field === "subjects") {
      school[req.params.field]["data"][req.params.idx] = req.body.new;
    } else {
      school[req.params.field][req.params.idx] = req.body.new;
    }
    school.markModified(req.params.field);
    await school.save();
    return res.status(200).send({ school });
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    /* find school document */
    const school = await _findById(req.user.dbName, req.params._id);

    school["settings"] = req.body.new;
    school.markModified(req.params.field);
    await school.save();
    return res.status(200).send({ school });
  } catch (err) {
    return res.status(500).send({ err: err.message });
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

exports.deleteFieldByIdx = async (req, res) => {
  try {
    /* find school document */
    const school = await _findById(req.user.dbName, req.params._id);

    if (req.params.field == "subjects") {
      school[req.params.field]["data"].splice(req.params.idx, 1);
    } else {
      school[req.params.field].splice(req.params.idx, 1);
    }

    await school.save();
    return res.status(200).send({ school });
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
