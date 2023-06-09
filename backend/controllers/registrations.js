/**
 * RegistrationAPI namespace
 * @namespace APIs.RegistrationAPI
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import { User, Registration, Season } from "../models/index.js";
import {
  FIELD_INVALID,
  FIELD_REQUIRED,
  REGISTRATION_IN_USE,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * @memberof APIs.RegistrationAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | REGISTRATION_NOT_FOUND | if registration is not found  |
 */

/**
 * @memberof APIs.RegistrationAPI
 * @function CRegistration API
 * @description 학기 등록 정보 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/registrations"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {string} req.body.season - ObjectId of season
 * @param {string} req.body.user - ObjectId of user
 * @param {"teacher"|"student"} req.body.role
 * @param {string?} req.body.grade
 * @param {string?} req.body.group
 * @param {string?} req.body.teacher - ObjectId of teacher
 * @param {string?} req.body.subTeacher - ObjectId of subTeacher
 *
 * @param {Object} res
 * @param {Object} res.season - created season
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | REGISTRATION_IN_USE | if registration is already made  |
 *
 *
 */
export const create = async (req, res) => {
  try {
    for (let field of ["season", "user", "role"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }
    if (req.body.role !== "teacher" && req.body.role !== "student") {
      return res.status(400).send({ message: FIELD_REQUIRED("role") });
    }

    const admin = req.user;

    // 기존 등록 정보가 있는지 확인
    if (
      await Registration(admin.academyId).findOne({
        season: req.body.season,
        user: req.body.user,
      })
    ) {
      return res.status(409).send({
        message: REGISTRATION_IN_USE,
      });
    }

    const season = await Season(admin.academyId).findById(req.body.season);
    if (!season) {
      return res.status(404).send({ message: __NOT_FOUND("season") });
    }

    const user = await User(admin.academyId).findById(req.body.user);
    if (!user) {
      return res.status(404).send({ message: __NOT_FOUND("user") });
    }

    let teacher = undefined;
    if ("teacher" in req.body) {
      teacher = await User(admin.academyId).findById(req.body.teacher);
      if (!teacher) {
        return res.status(404).send({ message: __NOT_FOUND("teacher") });
      }
    }

    let subTeacher = undefined;
    if ("subTeacher" in req.body) {
      subTeacher = await User(admin.academyId).findById(req.body.subTeacher);
      if (!subTeacher) {
        return res.status(404).send({ message: __NOT_FOUND("subTeacher") });
      }
    }

    const registration = await Registration(admin.academyId).create({
      ...season.getSubdocument(),
      user: user._id,
      userId: user.userId,
      userName: user.userName,
      role: req.body.role,
      grade: req.body.grade,
      group: req.body.group,
      teacher: teacher?._id,
      teacherId: teacher?.userId,
      teacherName: teacher?.userName,
      subTeacher: subTeacher?._id,
      subTeacherId: subTeacher?.userId,
      subTeacherName: subTeacher?.userName,
    });

    return res.status(200).send({ registration });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.RegistrationAPI
 * @function CCopyRegistrations API
 * @description 학기 등록 정보 복제 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/registrations/copy"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {string} req.body.fromSeason - ObjectId of season to cpoy registrations
 * @param {string} req.body.toSeason - ObjectId of season to paste registrations
 *
 * @param {Object} res
 * @param {Object} res.registrations - pasted registrations
 *
 */
export const copyFromSeason = async (req, res) => {
  try {
    for (let field of ["fromSeason", "toSeason"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    if (
      await Registration(req.user.academyId).findOne({
        season: req.body.toSeason,
      })
    ) {
      return res.status(409).send({ message: REGISTRATION_IN_USE });
    }

    const season = await Season(req.user.academyId).findById(req.body.toSeason);
    if (!season) {
      return res.status(404).send({ message: __NOT_FOUND("toSeason") });
    }

    const registrationsCopied = await Registration(req.user.academyId).find({
      season: req.body.fromSeason,
    });

    const registerationPasted = await Registration(
      req.user.academyId
    ).insertMany(
      registrationsCopied.map((reg) => {
        return {
          school: reg.school,
          schoolId: reg.schoolId,
          schoolName: reg.schoolName,
          user: reg.user,
          userId: reg.userId,
          userName: reg.userName,
          role: reg.role,
          grade: reg.grade,
          group: reg.group,
          teacher: reg.teacher,
          teacherId: reg.teacherId,
          teacherName: reg.teacherName,
          subTeacher: reg.subTeacher,
          subTeacherId: reg.subTeacherId,
          subTeacherName: reg.subTeacherName,
          ...season.getSubdocument(),
        };
      })
    );
    return res.status(200).send({ registerations: registerationPasted });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.RegistrationAPI
 * @function RRegistrations API
 * @description 학기 등록 정보 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/registrations"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.user
 * @param {string?} req.query.school
 * @param {string?} req.query.season
 * @param {string?} req.query.role
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object[]} res.registrations
 *
 */

/**
 * @memberof APIs.RegistrationAPI
 * @function RRegistration API
 * @description 학기 등록 정보 조회 API;
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/registrations/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object} res.registration
 *
 */
export const find = async (req, res) => {
  try {
    if (req.params._id) {
      const registration = await Registration(req.user.academyId).findById(
        req.params._id
      );
      if (!registration) {
        return res.status(404).send({ message: __NOT_FOUND("registration") });
      }
      return res.status(200).send({ registration });
    }

    const registrations = await Registration(req.user.academyId).find(
      req.query
    );
    return res.status(200).send({ registrations });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.RegistrationAPI
 * @function URegistration API
 * @description 학기 등록 정보 수정 API;
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/registrations/:_id"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {string} req.body.role
 * @param {string?} req.body.grade
 * @param {string?} req.body.group
 * @param {string?} req.body.teacher - ObjectId of teacher
 * @param {string?} req.body.subTeacher - ObjectId of subTeacher
 *
 * @param {Object} res
 * @param {Object} res.registration - updated registration
 *
 */
export const update = async (req, res) => {
  try {
    if (!("role" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("role") });
    }
    if (req.body.role !== "teacher" && req.body.role !== "student") {
      return res.status(400).send({ message: FIELD_INVALID("role") });
    }

    const admin = req.user;

    let teacher = undefined;
    if ("teacher" in req.body) {
      teacher = await User(admin.academyId).findById(req.body.teacher);
      if (!teacher) {
        return res.status(404).send({ message: __NOT_FOUND("teacher") });
      }
    }

    let subTeacher = undefined;
    if ("subTeacher" in req.body) {
      subTeacher = await User(admin.academyId).findById(req.body.subTeacher);
      if (!subTeacher) {
        return res.status(404).send({ message: __NOT_FOUND("subTeacher") });
      }
    }

    const registration = await Registration(admin.academyId).findById(
      req.params._id
    );
    registration.role = req.body.role;
    registration.grade = req.body.grade;
    registration.group = req.body.group;
    registration.teacher = teacher?._id;
    registration.teacherId = teacher?.userId;
    registration.teacherName = teacher?.userName;
    registration.subTeacher = subTeacher?._id;
    registration.subTeacherId = subTeacher?.userId;
    registration.subTeacherName = subTeacher?.userName;

    await registration.save();

    return res.status(200).send({ registration });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/* delete */
export const remove = async (req, res) => {
  try {
    const ids = _.split(req.query._id, ",");
    const result = await Registration(req.user.academyId).deleteMany({
      _id: { $in: ids },
    });

    return res.status(200).send(result);
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
