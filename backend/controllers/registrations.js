/**
 * RegistrationAPI namespace
 * @namespace APIs.RegistrationAPI
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import { User, Registration, Season } from "../models/index.js";
import {
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
 * @param {string?} req.body.role
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

/** @deprecated */
export const registerBulk = async (req, res) => {
  try {
    const season = await Season(req.user.academyId).findById(req.body.season);
    if (!season) {
      return res.status(404).send({ message: "season is not found" });
    }
    const exRegistrations = await Registration(req.user.academyId).find({
      season: season._id,
      user: { $in: req.body.users.map((user) => user._id) },
    });
    if (exRegistrations.length !== 0)
      return res.status(409).send({
        message: `users with _id ${_.join(
          exRegistrations.map((reg) => reg.user),
          ", "
        )} are already registered `,
      });

    const registerations = [];
    const seasonSubdocument = season.getSubdocument();
    const info = req.body.info;

    for (let user of req.body.users) {
      registerations.push({
        ...seasonSubdocument,
        user: user._id,
        userId: user.userId,
        userName: user.userName,
        role: info.role,
        grade: info.grade,
        group: info.group,
        teacher: info.teacher,
        teacherId: info.teacherId,
        teacherName: info.teacherName,
        subTeacher: info.subTeacher,
        subTeacherId: info.subTeacherId,
        subTeacherName: info.subTeacherName,
      });
    }
    const newRegistrations = await Registration(req.user.academyId).insertMany(
      registerations
    );
    return res.status(200).send({ registerations: newRegistrations });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const registerCopy = async (req, res) => {
  try {
    const exRegistrations = await Registration(req.user.academyId).find({
      season: req.body.fromSeason,
    });
    const season = await Season(req.user.academyId).findById(req.body.toSeason);
    if (!season) return res.status(404).send({ message: "season not found" });

    const seasonSubdocument = season.getSubdocument();
    const registerations = exRegistrations.map((registration) => {
      return {
        school: registration.school,
        schoolId: registration.schoolId,
        schoolName: registration.schoolName,
        user: registration.user,
        userId: registration.userId,
        userName: registration.userName,
        role: registration.role,
        grade: registration.grade,
        group: registration.group,
        teacher: registration.teacher,
        teacherId: registration.teacherId,
        teacherName: registration.teacherName,
        subTeacher: registration.subTeacher,
        subTeacherId: registration.subTeacherId,
        subTeacherName: registration.subTeacherName,
        ...seasonSubdocument,
      };
    });
    const newRegistrations = await Registration(req.user.academyId).insertMany(
      registerations
    );
    return res.status(200).send({ registerations: newRegistrations });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const find = async (req, res) => {
  try {
    if (req.params._id) {
      const registration = await Registration(req.user.academyId).findById(
        req.params._id
      );
      return res.status(200).send(registration);
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
 * update grade, group,teacherId,teacherName
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const update = async (req, res) => {
  try {
    const ids = _.split(req.params._ids, ",");

    const registrations = await Registration(req.user.academyId).find({
      _id: { $in: ids },
    });

    const updates = [];
    for (let reg of registrations) {
      reg.role = req.body.role;
      reg.grade = req.body.grade;
      reg.group = req.body.group;
      reg.teacher = req.body.teacher;
      reg.teacherId = req.body.teacherId;
      reg.teacherName = req.body.teacherName;
      reg.subTeacher = req.body.subTeacher;
      reg.subTeacherId = req.body.subTeacherId;
      reg.subTeacherName = req.body.subTeacherName;
      updates.push(reg.save());
    }

    await Promise.all(updates);

    return res.status(200).send(registrations);
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
