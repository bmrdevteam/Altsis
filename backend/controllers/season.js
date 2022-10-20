const _ = require("lodash");
const { Season, School, Syllabus, Enrollment } = require("../models/models");
const Registration = require("../models/Registration");

// check schoolId&year&term duplication
const checkDuplication = async (dbName, schoolId, year, term) => {
  const exSeason = await Season(dbName).findOne({
    schoolId,
    year,
    term,
  });
  if (exSeason) {
    const err = new Error("(schoolId, year, term) must be unique");
    err.status = 409;
    throw err;
  }
};

// check if syllabus exists in this season
const checkSyllabus = async (dbName, season) => {
  const syllabus = await Syllabus(dbName).findOne({
    season: season._id,
  });
  if (syllabus) {
    const err = new Error(
      "it can't be updated because there's a syllabus created in this season"
    );
    err.status = 409;
    throw err;
  }
};

// check if evaluation exists in this season
const checkEvaluation = async (dbName, season) => {
  const enrollment = await Enrollment(dbName).findOne({
    season: season._id,
    evaluation: { $ne: null },
  });
  if (enrollment) {
    const err = new Error(
      "it can't be changed because there's a evaluation created in this season"
    );
    err.status = 409;
    throw err;
  }
};

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

    return res.status(200).send({ seasons });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

/* update */
module.exports.update = async (req, res) => {
  try {
    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) return res.status(404).send({ message: "season not found" });

    // 해당 시즌의 syllabus가 존재면 season을 수정할 수 없다.
    await checkSyllabus(req.user.dbName, season);

    let registrations = [];

    // year, term => (schoolId, year, term)은 unique해야 한다.
    if (req.body.new.year != season.year || req.body.new.term != season.term) {
      await checkDuplication(
        req.user.dbName,
        season.schoolId,
        req.body.new.year,
        req.body.new.term
      );
      registrations = await Registration(req.user.dbName).find({
        season: season._id,
      });
    }

    [
      "year",
      "term",
      "classrooms",
      "subjects",
      "formTimetable",
      "formSyllabus",
      "formEvaluation",
      "permissionSyllabus",
      "permissionEnrollment",
      "permissionEvaluation",
      "period",
    ].forEach((field) => {
      season[field] = req.body.new[field];
    });

    await season.save();
    // year 또는 term이 변경되면
    // registration 일괄 수정
    await Promise.all(
      registrations.map((registration) => {
        registration.year = season.year;
        registration.term = season.term;
        registration.save();
      })
    );

    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateField = async (req, res) => {
  try {
    const season = await Season(req.user.dbName).findById(req.params._id);
    if (!season) return res.status(404).send({ message: "season not found" });

    let field = req.params.field;
    if (req.params.fieldType)
      field +=
        req.params.fieldType[0].toUpperCase() + req.params.fieldType.slice(1);

    switch (field) {
      // year, term => (schoolId, year, term)은 unique해야 한다.
      case "year":
        await checkDuplication(
          req.user.dbName,
          season.schoolId,
          req.body.new,
          season.term
        );
        break;
      case "term":
        await checkDuplication(
          req.user.dbName,
          season.schoolId,
          season.year,
          req.body.new
        );
        break;
      // classrooms, subjects, formTimetable, formSyllabus => 해당 시즌에 syllabus가 존재하면 수정할 수 없다.
      case "classrooms":
      case "subjects":
      case "formTimetable":
      case "formSyllabus":
        await checkSyllabus(req.user.dbName, season);
        break;
      // formEvaluation => 해당 시즌에 evaluation이 존재하면 수정할 수 없다.
      case "formEvaluation":
        await checkEvaluation(req.user.dbName, season);
        break;
      // permissionSyllabus, permissionEnrollment, permissionEvaluation, period => 수정 제약 없음
      case "permissionSyllabus":
      case "permissionEnrollment":
      case "permissionEvaluation":
      case "period":
        break;
      default:
        return res.status(400).send();
    }

    season[field] = req.body.new;
    await season.save();
    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
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
