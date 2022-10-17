const _ = require("lodash");
const { Season, School, Syllabus, Enrollment } = require("../models/models");

/* create */

module.exports.create = async (req, res) => {
  try {
    const school = await School(req.user.dbName).findOne({
      schoolId: req.body.schoolId,
    });
    if (!school) return res.status(404).send();

    const _Season = Season(req.user.dbName);

    /* check duplication */
    const exSeason = await _Season.findOne({
      schoolId: school.schoolId,
      year: req.body.year,
      term: req.body.term,
    });
    if (exSeason)
      return res.status(409).send({
        message: `season(${req.body.schoolId},${req.body.year},${req.body.term}) is already in use`,
      });

    /* create and save document */
    const season = new _Season(req.body);
    season.schoolName = school.schoolName;
    season.classrooms = school.classrooms;
    season.subjects = school.subjects;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    if (req.params._id) {
      const season = await Season(req.user.dbName).findById(req.params._id);
      return res.status(200).send(season);
    }
    const seasons = await Season(req.user.dbName)
      .find(req.query)
      .select(["schoolId", "schoolName", "year", "term"]);

    return res.status(200).send(seasons);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updatePermission = async (req, res) => {
  try {
    if (
      ["syllabus", "enrollment", "evaluation"].indexOf(
        req.params.permissionType
      ) == -1
    )
      return res.status(400);

    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) return res.status(404).send({ message: "season not found" });

    if (req.params.permissionType == "syllabus")
      season.permissionSyllabus = req.body.new;
    else if (req.params.permissionType == "enrollment")
      season.permissionEnrollment = req.body.new;
    else season.permissionEvaluation = req.body.new;

    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateFormEvaluation = async (req, res) => {
  try {
    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) return res.status(404).send({ message: "season not found" });

    /* it can't be updated  if syllabuses created in this season */
    const enrollment = await Enrollment(req.user.dbName).findOne({
      season: season._id,
      evaluation: { $ne: null },
    });
    if (enrollment)
      return res.status(409).send({
        message:
          "it can't be changed because there's a evaluation created in this season",
      });

    season.formEvaluation = req.body.new;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateForm = async (req, res) => {
  try {
    if (["timetable", "syllabus"].indexOf(req.params.formType) == -1)
      return res.status(400).send();

    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) return res.status(404).send({ message: "season not found" });

    /* it can't be updated  if syllabuses created in this season */
    const syllabus = await Syllabus(req.user.dbName).findOne({
      season: season._id,
    });
    if (syllabus) {
      return res.status(409).send({
        message:
          "it can't be updated because there's a syllabus created in this season",
      });
    }
    if (req.paramsv.formType == "timetable") season.formTimetable = req.body.new;
    else season.formSyllabus = req.body.new;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateField = async (req, res) => {
  try {
    if (["subjects", "classrooms"].indexOf(req.params.field) == -1)
      return res.status(400).send();

    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) return res.status(404).send({ message: "season not found" });

    /* it can't be updated  if syllabuses created in this season */
    const syllabus = await Syllabus(req.user.dbName).findOne({
      season: season._id,
    });
    if (syllabus) {
      return res.status(409).send({
        message:
          "it can't be updated because there's a syllabus created in this season",
      });
    }
    season[req.params.field] = req.body.new;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

/* delete */

exports.delete = async (req, res) => {
  try {
    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) return res.status(404).send();
    await season.delete();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
