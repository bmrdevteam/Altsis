const _ = require("lodash");
const Season = require("../models/Season");
const School = require("../models/School");
const Syllabus = require("../models/Syllabus");
const Evaluation = require("../models/Evaluation");

/* create */

module.exports.create = async (req, res) => {
  try {
    const school = await School(req.user.dbName).findOne({
      schoolId: req.body.schoolId,
    });
    if (!school) {
      return res.status(404).send();
    }

    const _Season = Season(req.user.dbName);

    /* check duplication */
    const exSeason = await _Season.findOne({
      schoolId: school.schoolId,
      year: req.body.year,
      term: req.body.term,
    });
    if (exSeason) {
      return res.status(409).send({
        message: `season(${req.body.schoolId},${req.body.year},${req.body.term}) is already in use`,
      });
    }

    /* create and save document */
    const season = new _Season(req.body);
    season.schoolName = school.schoolName;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    const _Season = Season(req.user.dbName);

    if (req.params._id) {
      const season = await _Season.findById(req.params._id);
      return res.status(200).send(season);
    }
    const seasons = await _Season.find(req.query);

    return res.status(200).send(
      seasons.map((season) => {
        return {
          _id: season._id,
          schoolId: season.schoolId,
          year: season.year,
          term: season.term,
        };
      })
    );
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updatePermissionSyllabus = async (req, res) => {
  try {
    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }
    season.permissionSyllabus = req.body.new;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updatePermissionEnrollment = async (req, res) => {
  try {
    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }
    season.permissionEnrollment = req.body.new;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateSubjects = async (req, res) => {
  try {
    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }
    /* it can't be updated  if syllabuses created in this season */
    const syllabus = await Syllabus(req.user.dbName).findOne({
      schoolId: season.schoolId,
      year: season.year,
      term: season.term,
    });
    if (!syllabus) {
      return res.status(409).send({
        message:
          "it can't be changed because there's a syllabus created in this season",
      });
    }

    season.subjects = req.body.new;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateClassrooms = async (req, res) => {
  try {
    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }
    /* it can't be updated  if syllabuses created in this season */
    const syllabus = await Syllabus(req.user.dbName).findOne({
      schoolId: season.schoolId,
      year: season.year,
      term: season.term,
    });
    if (!syllabus) {
      return res.status(409).send({
        message:
          "it can't be changed because there's a syllabus created in this season",
      });
    }

    season.classrooms = req.body.new;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateFormTimetable = async (req, res) => {
  try {
    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }
    /* it can't be updated  if syllabuses created in this season */
    const syllabus = await Syllabus(req.user.dbName).findOne({
      schoolId: season.schoolId,
      year: season.year,
      term: season.term,
    });
    if (syllabus) {
      return res.status(409).send({
        message:
          "it can't be changed because there's a syllabus created in this season",
      });
    }

    season.formTimetable = req.body.new;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateFormSyllabus = async (req, res) => {
  try {
    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }
    /* it can't be updated  if syllabuses created in this season */
    const syllabus = await Syllabus(req.user.dbName).findOne({
      schoolId: season.schoolId,
      year: season.year,
      term: season.term,
    });
    if (syllabus) {
      return res.status(409).send({
        message:
          "it can't be changed because there's a syllabus created in this season",
      });
    }
    season.formSyllabus = req.body.new;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateFormEvaluation = async (req, res) => {
  try {
    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }
    /* it can't be updated  if syllabuses created in this season */
    const evaluation = await Evaluation(req.user.dbName).findOne({
      schoolId: season.schoolId,
      year: season.year,
      term: season.term,
    });
    if (evaluation) {
      return res.status(409).send({
        message:
          "it can't be changed because there's a syllabus created in this season",
      });
    }
    season.formEvaluation = req.body.new;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/* delete */

exports.delete = async (req, res) => {
  try {
    await Season(req.user.dbName).findByIdAndDelete(req.params._id);
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
