/**
 * SeasonAPI namespace
 * @namespace APIs.SeasonAPI
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import {
  Season,
  School,
  Syllabus,
  Enrollment,
  Registration,
} from "../models/index.js";
import {
  FIELD_INVALID,
  FIELD_IN_USE,
  FIELD_REQUIRED,
  __NOT_FOUND,
} from "../messages/index.js";
import { validate } from "../utils/validate.js";

// check schoolId&year&term duplication
const checkDuplication = async (academyId, schoolId, year, term) => {
  const exSeason = await Season(academyId).findOne({
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
const checkSyllabus = async (academyId, season) => {
  const syllabus = await Syllabus(academyId).findOne({
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

/**
 * @memberof APIs.SeasonAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | SEASON_NOT_FOUND | if season is not found  |
 */

/**
 * @memberof APIs.SeasonAPI
 * @function CSeason API
 * @description 학기 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/seasons"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {string} req.body.school - ObjectId of school(sid)
 * @param {string} req.body.year
 * @param {string} req.body.term
 * @param {string} req.body.period
 * @param {string} req.body.period.start - "YYYY-MM-DD"
 * @param {string} req.body.period.end - "YYYY-MM-DD"
 * @param {string?} req.body.copyFrom - ObjectId of season to copy from
 *
 * @param {Object} res
 * @param {Object} res.season - created season
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | YEAR_TERM_IN_USE | if parameters year and term are in use  |
 *
 *
 */

export const create = async (req, res) => {
  try {
    /* validate */
    for (let field of ["school", "year", "term"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }
    if ("period" in req.body) {
      for (let field of ["start", "end"]) {
        if (
          field in req.body.period &&
          !validate("dateText", req.body.period[field])
        ) {
          return res.status(400).send({ message: FIELD_INVALID(field) });
        }
      }
    }

    const admin = req.user;

    /* check duplication */
    if (
      await Season(admin.academyId).findOne({
        school: req.body.school,
        year: req.body.year,
        term: req.body.term,
      })
    ) {
      return res.status(409).send({
        message: FIELD_IN_USE("year_term"),
      });
    }

    const school = await School(admin.academyId).findById(req.body.school);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    if ("copyFrom" in req.body) {
      const seasonToCopy = await Season(admin.academyId).findById(
        req.body.copyFrom
      );
      if (!seasonToCopy) {
        return res.status(404).send({
          message: __NOT_FOUND("season"),
        });
      }

      /* create and save document */
      const season = await Season(admin.academyId).create({
        ...seasonToCopy.toObject(),
        _id: undefined,
        year: req.body.year,
        term: req.body.term,
        period: req.body.period,
        isActivated: false,
        isActivatedFirst: false,
      });

      const registrationsToCopy = await Registration(admin.academyId).find({
        season: seasonToCopy._id,
      });
      const registrations = registrationsToCopy.map((reg) => {
        return {
          ...reg.toObject(),
          _id: undefined,
          season: season._id,
          year: season.year,
          term: season.term,
          period: season.period,
          isActivated: season.isActivated,
        };
      });
      await Registration(admin.academyId).insertMany(registrations);

      return res.status(200).send({ season });
    }

    /* create and save document */
    const season = await Season(admin.academyId).create({
      school: school._id,
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      year: req.body.year,
      term: req.body.term,
      period: req.body.period,
    });

    return res.status(200).send({ season });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const find = async (req, res) => {
  try {
    if (req.params._id) {
      const season = await Season(req.user.academyId).findById(req.params._id);
      if (req.query.withRegistrations === "true") {
        const registrations = await Registration(req.user.academyId)
          .find({
            season: season._id,
          })
          .select([
            "user",
            "userId",
            "userName",
            "role",
            "grade",
            "teacher",
            "teacherId",
            "teacherName",
            "subTeacher",
            "subTeacherId",
            "subTeacherName",
            "group",
          ]);
        return res.status(200).send({ ...season.toObject(), registrations });
      }
      return res.status(200).send(season);
    }
    const seasons = await Season(req.user.academyId)
      .find(req.query)
      .select([
        "school",
        "schoolId",
        "schoolName",
        "year",
        "term",
        "period",
        "isActivated",
        "isActivatedFirst",
      ]);

    return res.status(200).send({ seasons });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/* update */
export const update = async (req, res) => {
  try {
    const season = await Season(req.user.academyId).findById(req.params._id);
    if (!season) return res.status(404).send({ message: "season not found" });

    // 해당 시즌의 syllabus가 존재하면 season을 수정할 수 없다.
    await checkSyllabus(req.user.academyId, season);

    const isUpdated = {
      year: req.body.new.year != season.year,
      term: req.body.new.term != season.term,
      period: !_.isEqual(req.body.period, season.period),
    };
    const doc = {};
    // year, term => (schoolId, year, term)은 unique해야 한다.
    if (isUpdated["year"] || isUpdated["Term"]) {
      await checkDuplication(
        req.user.academyId,
        season.schoolId,
        req.body.new.year,
        req.body.new.term
      );
      doc["year"] = req.body.new.year;
      doc["term"] = req.body.new.term;
    }
    if (isUpdated["period"]) {
      doc["period"] = req.body.new.period;
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

    // year, term, period가 변경되면
    // registration 일괄 수정
    if (!_.isEmpty(doc)) {
      await Registration(req.user.academyId).update(
        { season: season._id },
        doc
      );
    }

    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const activate = async (req, res) => {
  try {
    /* activate season */
    const season = await Season(req.user.academyId).findById(req.params._id);
    if (!season) return res.status(404).send({ message: "season not found" });

    if (!season.isActivated) {
      season.isActivated = true;
      if (!season.isActivatedFirst) {
        season.isActivatedFirst = true;
        await season.save();
        /* activate registrations */
        await Registration(req.user.academyId).updateMany(
          { season: season._id },
          { isActivated: true, formEvaluation: season.formEvaluation }
        );
      } else {
        await season.save();
        /* activate registrations */
        await Registration(req.user.academyId).updateMany(
          { season: season._id },
          { isActivated: true }
        );
      }
      return res.status(200).send(season);
    }
    return res.status(409).send({ message: "season is already activated" });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const inactivate = async (req, res) => {
  try {
    /* activate season */
    const season = await Season(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      { isActivated: false },
      { new: true }
    );
    if (!season) return res.status(404).send({ message: "season not found" });

    /* activate registrations */
    await Registration(req.user.academyId).updateMany(
      { season: season._id },
      { isActivated: false }
    );

    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

const getPermissionField = (type) => {
  if (type === "syllabus") {
    return "permissionSyllabusV2";
  }
  if (type === "enrollment") {
    return "permissionEnrollmentV2";
  }
  if (type === "evaluation") {
    return "permissionEvaluationV2";
  }
  return undefined;
};

export const updatePermission = async (req, res) => {
  try {
    const season = await Season(req.user.academyId).findById(req.params._id);
    if (!season) return res.status(404).send({ message: "season not found" });

    const permission = getPermissionField(req.params.type);
    if (!permission) {
      return res.status(400).send({ message: "invalid request" });
    }

    if ("teacher" in req.body) {
      season[permission].teacher = req.body.teacher;
      season.markModified(permission);
      await season.save();
      await Registration(req.user.academyId).updateMany(
        {
          season: season._id,
          role: "teacher",
          _id: {
            $nin: season[permission].exceptions.map((ex) => ex.registration),
          },
        },
        { [permission]: req.body.teacher }
      );
    } else if ("student" in req.body) {
      season[permission].student = req.body.student;
      season.markModified(permission);
      await season.save();
      await Registration(req.user.academyId).updateMany(
        {
          season: season._id,
          role: "student",
          _id: {
            $nin: season[permission].exceptions.map((ex) => ex.registration),
          },
        },
        { [permission]: req.body.student }
      );
    } else {
      return res.status(400).send({ message: "invalid request" });
    }

    return res.status(200).send({ season });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const addPermissionException = async (req, res) => {
  try {
    const season = await Season(req.user.academyId).findById(req.params._id);
    if (!season) return res.status(404).send({ message: "season not found" });

    const permission = getPermissionField(req.params.type);
    if (!permission) {
      return res.status(400).send({ message: "invalid request" });
    }

    if ("registration" in req.body && "isAllowed" in req.body) {
      season[permission].exceptions.push(req.body);
      season.markModified(permission);
      await season.save();
      await Registration(req.user.academyId).findByIdAndUpdate(
        req.body.registration,
        { [permission]: req.body.isAllowed }
      );
    } else {
      return res.status(400).send({ message: "invalid request" });
    }

    return res.status(200).send({ season });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const removePermissionException = async (req, res) => {
  try {
    console.log(req.user);
    const season = await Season(req.user.academyId).findById(req.params._id);
    if (!season) return res.status(404).send({ message: "season not found" });

    const permission = getPermissionField(req.params.type);
    if (!permission) {
      return res.status(400).send({ message: "invalid request" });
    }

    if ("registration" in req.query) {
      const idx = _.findIndex(
        season[permission].exceptions,
        (ex) => ex.registration === req.query.registration
      );
      if (idx === -1) {
        return res.status(404).send({});
      }
      const registration = await Registration(req.user.academyId).findById(
        req.query.registration
      );
      if (!registration) return res.status(404).send({});

      registration[permission] = season[permission][registration.role];
      await registration.save();

      season[permission].exceptions.splice(idx, 1);
      season.markModified(permission);
      await season.save();
    } else {
      return res.status(400).send({ message: "invalid request" });
    }

    return res.status(200).send({ season });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const updateField = async (req, res) => {
  try {
    const _season = await Season(req.user.academyId).findById(req.params._id);
    if (!_season) return res.status(404).send({ message: "season not found" });

    let field = req.params.field;
    if (req.params.fieldType)
      field +=
        req.params.fieldType[0].toUpperCase() + req.params.fieldType.slice(1);

    switch (field) {
      case "formTimetable":
      case "formSyllabus":
      case "formEvaluation":
        if (_season.isActivatedFirst)
          return res.status(409).send({
            message: "한 번 활성화된 시즌의 양식을 변경할 수 업습니다.",
          });

      // classrooms, subjects, formTimetable, formSyllabus => 해당 시즌에 syllabus가 존재하면 수정할 수 없다.
      case "classrooms":
      case "subjects":

      // permissionSyllabus, permissionEnrollment, permissionEvaluation, period => 수정 제약 없음
      case "permissionSyllabus":
      case "permissionEnrollment":
      case "permissionEvaluation":
      case "period":
        break;
      default:
        return res.status(400).send();
    }

    const season = await Season(req.user.academyId).findByIdAndUpdate(
      _season._id,
      { [field]: req.body.new },
      { new: true }
    );
    // season[field] = req.body.new;
    // await season.save();

    // period가 변경되면
    // registration 일괄 수정
    if (field === "period") {
      await Registration(req.user.academyId).updateMany(
        { season: season._id },
        { period: season.period }
      );
    }

    return res.status(200).send(season);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/* delete */

export const remove = async (req, res) => {
  try {
    const season = await Season(req.user.academyId).findById(req.params._id);
    if (!season) return res.status(404).send();

    await Registration(req.user.academyId).deleteMany({
      season: season._id,
    });

    await season.delete();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
