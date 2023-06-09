/**
 * SchoolAPI namespace
 * @namespace APIs.SchoolAPI
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import {
  Archive,
  Enrollment,
  Registration,
  School,
  Season,
  Syllabus,
  User,
} from "../models/index.js";
import {
  FIELD_INVALID,
  FIELD_IN_USE,
  FIELD_REQUIRED,
  FORM_LABEL_DUPLICATED,
  __NOT_FOUND,
} from "../messages/index.js";
import { validate } from "../utils/validate.js";

/**
 * @memberof APIs.SchoolAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | SCHOOL_NOT_FOUND | if school is not found  |
 */

/**
 * @memberof APIs.SchoolAPI
 * @function CSchool API
 * @description 학교 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/schools"} req.url
 *
 * @param {Object} req.user - "admin"
 *
 * @param {Object} req.body
 * @param {string} req.body.schoolId - "^[a-z|A-Z|0-9]{2,20}$"
 * @param {string} req.body.schoolName - "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣| ]{2,20}$"
 *
 * @param {Object} res
 * @param {Object} res.school - created school
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | SCHOOLID_IN_USE | if parameter schoolId is in use  |
 *
 *
 */
export const create = async (req, res) => {
  try {
    /* validate */
    for (let field of ["schoolId", "schoolName"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
      if (!validate(field, req.body[field])) {
        return res.status(400).send({ message: FIELD_INVALID(field) });
      }
    }

    const admin = req.user;

    /* check duplication */
    if (
      await School(admin.academyId).findOne({ schoolId: req.body.schoolId })
    ) {
      return res.status(409).send({ message: FIELD_IN_USE("schoolId") });
    }

    /* create and save document */
    const school = await School(admin.academyId).create({
      schoolId: req.body.schoolId,
      schoolName: req.body.schoolName,
    });

    return res.status(200).send({ school });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function RSchools API
 * @description 학교 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/schools"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object[]} res.schools
 *
 */

/**
 * @memberof APIs.SchoolAPI
 * @function RSchool API
 * @description 학교 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/schools/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object} res.school
 *
 */
export const find = async (req, res) => {
  try {
    if (req.params._id) {
      const school = await School(req.user.academyId).findById(req.params._id);
      if (!school) {
        return res.status(404).send({ message: __NOT_FOUND("school") });
      }

      return res.status(200).send({
        school,
      });
    }

    const schools = await School(req.user.academyId).find({}).lean();
    return res.status(200).send({ schools });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function USchoolFormArchive API
 * @description 학교 기록 양식 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/schools/:_id/formArchive"} req.url
 *
 * @param {Object} req.user - "admin|"manager"
 *
 * @param {Object} req.body
 * @param {Object[]} req.body.formArchive
 *
 * @param {Object} res
 * @param {Object} res.formArchive - updated formArchive
 *
 * @see models>School for validation
 */
export const updateFormArchive = async (req, res) => {
  try {
    /* validation */
    if (!("formArchive" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("formArchive") });
    }

    // 라벨 중복 검사
    for (let i = 0; i < req.body.formArchive.length; i++) {
      // 필드 중복 검사
      for (let ii = 0; ii < req.body.formArchive[i].fields?.length; ii++) {
        for (
          let jj = ii + 1;
          jj < req.body.formArchive[i].fields?.length;
          jj++
        ) {
          if (
            req.body.formArchive[i].fields[ii].label ===
            req.body.formArchive[i].fields[jj].label
          ) {
            return res.status(400).send({ message: FORM_LABEL_DUPLICATED });
          }
        }
      }
      for (let j = i + 1; j < req.body.formArchive.length; j++) {
        if (req.body.formArchive[i].label === req.body.formArchive[j].label) {
          return res.status(400).send({ message: FORM_LABEL_DUPLICATED });
        }
      }
    }

    const school = await School(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      {
        formArchive: req.body.formArchive,
      },
      { new: true }
    );
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    return res.status(200).send({ formArchive: school.formArchive });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function USchoolLinks API
 * @description 학교 링크 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/schools/:_id/links"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {string[]} req.body.links
 *
 * @param {Object} res
 * @param {Object} res.links - updated links
 *
 */
export const updateLinks = async (req, res) => {
  try {
    if (!("links" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("links") });
    }
    for (let link of req.body.links) {
      for (let field of ["url", "title"]) {
        if (!(field in link)) {
          return res.status(400).send({ message: FIELD_REQUIRED(field) });
        }
      }
    }

    const school = await School(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      { links: req.body.links },
      { new: true }
    );
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    return res.status(200).send({ links: school.links });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function USchoolCalendars API
 * @description 학교 캘린더 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/schools/:_id/links"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {string?} req.body.calendar - 학사 일정 캘린더
 * @param {string?} req.body.calendarTimetable - 시간표 캘린더
 *
 * @param {Object} res
 * @param {string?} res.calendar - updated calendar
 * @param {string?} res.calendarTimetable - updated calendarTimetable
 *
 */
export const updateCalendars = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    school["calendar"] = req.body.calendar;
    school["calendarTimetable"] = req.body.calendarTimetable;
    await school.save();

    return res.status(200).send({
      calendar: school.calendar,
      calendarTimetable: school.calendarTimetable,
    });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function DSchool API
 * @description 학교 삭제 API; 관련 데이터를 모두 삭제한다
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/schools/:_id"} req.url
 *
 * @param {Object} req.user - "admin"
 *
 * @param {Object} res
 *
 */
export const remove = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    const admin = req.user;

    const users = await User(admin.academyId).find({
      "schools.school": school._id,
    });

    for (let user of users) {
      const idx = _.findIndex(user.schools, (userSchool) =>
        userSchool.school.equals(school._id)
      );
      if (idx !== -1) {
        user.schools.splice(idx, 1);
        user.isModified("schools");
      }
    }
    await Promise.all(users.map((user) => user.save()));
    await Promise.all([
      Enrollment(admin.academyId).deleteMany({ school: school._id }),
      Syllabus(admin.academyId).deleteMany({ school: school._id }),
      Registration(admin.academyId).deleteMany({ school: school._id }),
      Season(admin.academyId).deleteMany({ school: school._id }),
      Archive(admin.academyId).deleteMany({ school: school._id }),
    ]);
    await school.delete();

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
