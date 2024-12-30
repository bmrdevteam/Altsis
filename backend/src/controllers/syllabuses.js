/**
 * SyllabusAPI namespace
 * @namespace APIs.SyllabusAPI
 * @see TSyllabus in {@link Models.Syllabus}
 */
import { logger } from "../log/logger.js";
import {
  CLASSROOM_IN_USE,
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  SYLLABUS_CONFIRMED_ALREADY,
  SYLLABUS_COUNT_EXCEEDS_LIMIT,
  SYLLABUS_ENROLLED_ALREADY,
  __NOT_FOUND,
} from "../messages/index.js";
import { Registration, Syllabus, Enrollment } from "../models/index.js";
import _ from "lodash";

const isFullyConfirmed = (syllabus) =>
  _.filter(syllabus.teachers, { confirmed: true }).length ===
  syllabus.teachers.length;

const isClassroomAvailable = async (
  academyId,
  season,
  classroom,
  time,
  syllabus = undefined
) => {
  if (classroom === "") return true;
  const exSyllabus = await Syllabus(academyId).findOne({
    _id: { $ne: syllabus?._id },
    season,
    classroom,
    "time.label": { $in: time.map((timeBlock) => timeBlock.label) },
  });

  return exSyllabus ? false : true;
};

/**
 * @memberof APIs.SyllabusAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | SYLLABUS_NOT_FOUND | if syllabus is not found  |
 * | 403    | PERMISSION_DENIED | user has no permission for create/update/delete syllabus  |
 */

/**
 * @memberof APIs.SyllabusAPI
 * @function CSyllabus API
 * @description 강의계획서 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/syllabuses"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 * @param {string} req.body.season - ObjectId of season
 * @param {string[]} req.body.subject
 * @param {string} req.body.classTitle
 * @param {Object[]} req.body.teachers
 * @param {Object[]} req.body.time
 * @param {string} req.body.classroom
 * @param {number} req.body.point
 * @param {number} req.body.limit
 * @param {Object} req.body.info
 *
 * @param {Object} res
 * @param {Object} res.syllabus - created syllabus
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | CLASSROOM_IN_USE | if classroom is in use  |
 *
 *
 */
export const create = async (req, res) => {
  try {
    /* validation */
    for (let field of [
      "season",
      "subject",
      "classTitle",
      "teachers",
      "time",
      "classroom",
      "point",
      "limit",
    ]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const user = req.user;

    /* 권한 확인 */
    const registration = await Registration(user.academyId).findOne({
      user: user._id,
      season: req.body.season,
    });
    if (!registration) {
      return res.status(404).send({ message: __NOT_FOUND("registration") });
    }
    if (!registration?.permissionSyllabusV2) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    /* 강의실 중복 확인 */
    if (
      !(await isClassroomAvailable(
        req.user.academyId,
        req.body.season,
        req.body.classroom,
        req.body.time
      ))
    ) {
      return res.status(409).send({ message: CLASSROOM_IN_USE });
    }

    const syllabus = await Syllabus(req.user.academyId).create({
      ...registration.getSubdocument(),
      classTitle: req.body.classTitle,
      time: req.body.time,
      classroom: req.body.classroom,
      subject: req.body.subject,
      point: req.body.point,
      limit: req.body.limit,
      info: req.body.info,
      teachers: req.body.teachers,
      temp: req.body.temp,
    });

    return res.status(200).send({ syllabus });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.SyllabusAPI
 * @function RSyllabuses API
 * @description 강의계획서 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/syllabuses"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.season - ObjectId of season
 * @param {string?} req.query.classroom
 * @param {string?} req.query.confirmed
 * @param {string?} req.query.user
 * @param {string?} req.query.teacher
 * @param {string?} req.query.student
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object} res.syllabuses
 * @param {Object} res.enrollments - if req.query.student is given
 *
 */

/**
 * @memberof APIs.SyllabusAPI
 * @function RSyllabus API
 * @description 강의계획서 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/syllabuses/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object} res.syllabus
 *
 */
export const find = async (req, res) => {
  try {
    if (req.params._id) {
      const syllabus = await Syllabus(req.user.academyId).findById(
        req.params._id
      );
      if (!syllabus) {
        return res.status(404).send({ message: __NOT_FOUND("syllabus") });
      }
      return res.status(200).send({ syllabus });
    }

    const query = {};

    // find by season
    if ("season" in req.query) {
      query["season"] = req.query.season;
    }

    // find by classroom
    if ("classroom" in req.query) {
      query["classroom"] = req.query.classroom;
    }

    // find fully-confirmed syllabuses
    if ("confirmed" in req.query) {
      query["teachers.confirmed"] = { $ne: false };
    }

    // find by teacher
    if ("teacher" in req.query) {
      query["teachers._id"] = req.query.teacher;
    }

    // find by user
    if ("user" in req.query) {
      query["user"] = req.query.user;
    }

    // find by student with enrollments
    if ("student" in req.query) {
      const enrollments = await Enrollment(req.user.academyId)
        .find({
          season: req.query.season,
          student: req.query.student,
        })
        .select(["-evaluation", "-info"]);

      const syllabuses = await Syllabus(req.user.academyId)
        .find({ _id: { $in: enrollments.map((e) => e.syllabus) } })
        .select("-info");
      return res.status(200).send({ syllabuses, enrollments });
    }

    const syllabuses = await Syllabus(req.user.academyId)
      .find(query)
      .select("-info");
    return res.status(200).send({ syllabuses });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

/**
 * @memberof APIs.SyllabusAPI
 * @function UConfirmSyllabus API
 * @description 강의계획서 승인 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/syllabuses/:_id/confirm"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 * @param {Object} res.syllabus - updated syllabus
 *
 */
export const confirm = async (req, res) => {
  try {
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.params._id
    );
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }
    for (let i = 0; i < syllabus.teachers.length; i++) {
      if (syllabus.teachers[i]._id.equals(req.user._id)) {
        syllabus.teachers[i].confirmed = true;
        await syllabus.save();
        return res.status(200).send({ syllabus });
      }
    }
    return res.status(403).send({ message: PERMISSION_DENIED });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

/**
 * @memberof APIs.SyllabusAPI
 * @function UCancelConfirmSyllabus API
 * @description 강의계획서 승인 취소 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/syllabuses/:_id/confirm"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 * @param {Object} res.syllabus - updated syllabus
 *
 */
export const cancelConfirm = async (req, res) => {
  try {
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.params._id
    );
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    for (let i = 0; i < syllabus.teachers.length; i++) {
      if (syllabus.teachers[i]._id.equals(req.user._id)) {
        if (syllabus.count > 0) {
          return res.status(409).send({
            message: SYLLABUS_ENROLLED_ALREADY,
          });
        }
        syllabus.teachers[i].confirmed = false;
        await syllabus.save();
        return res.status(200).send({ syllabus });
      }
    }
    return res.status(403).send({ message: PERMISSION_DENIED });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

/**
 * @memberof APIs.SyllabusAPI
 * @function USyllabus API
 * @description 강의계획서 수정 API; 지도교사가 이미 수강생이 있는 강의계획서를 수정하는 경우 시간, 강의실, 교과목은 변경되지 않는다. 교과목 변경은 USyllabusSubject API 별도 요청 필요.
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/syllabuses/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 * @param {string[]} req.body.subject
 * @param {string} req.body.classTitle
 * @param {Object[]} req.body.teachers
 * @param {Object[]} req.body.time
 * @param {string} req.body.classroom
 * @param {number} req.body.point
 * @param {number} req.body.limit
 * @param {Object} req.body.info
 *
 * @param {Object} res
 * @param {Object} res.syllabus - updated syllabus
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 403    | SYLLABUS_CONFIRMED_ALREADY | if syllabus is fully confirmed |
 * | 403    | SYLLABUS_ENROLLED_ALREADY | if syllabus has at least one enrollment |
 * | 409    | SYLLABUS_COUNT_EXCEEDS_LIMIT | if number of enrollments exeeds limit |
 * | 409    | CLASSROOM_IN_USE | if classroom is in use  |
 *
 */
export const updateV2 = async (req, res) => {
  try {
    const fields = [
      "classTitle",
      "time",
      "point",
      "classroom",
      "subject",
      "teachers",
      "info",
      "limit",
    ];
    for (let field of fields) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const user = req.user;

    const syllabus = await Syllabus(user.academyId).findById(req.params._id);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    /* 권한 확인 */
    const registration = await Registration(user.academyId).findOne({
      user: user._id,
      season: syllabus.season,
    });
    if (!registration) {
      return res.status(404).send({ message: __NOT_FOUND("registration") });
    }
    if (!registration?.permissionSyllabusV2) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    /* 별도 확인이 필요한 수정 사항 확인 */
    const isUpdated = {
      time: !(
        syllabus.time.length === req.body.time.length &&
        syllabus.time.every(
          (timeBlock, idx) => timeBlock.label === req.body.time[idx].label
        )
      ),
      // syllabus.classroom과 req.body.classroom가 동시에 ''또는 undefined일 경우는 false를 반환한다.
      classroom: syllabus.classroom !== req.body.classroom && !(!syllabus.classroom && !req.body.classroom),
      subject: !_.isEqual(syllabus.subject, req.body.subject),
      limit: syllabus.limit !== req.body.limit,
    };

    /* 1. user가 syllabus 작성자이고 지도교사가 아닌 경우 */
    if (
      user._id.equals(syllabus.user) &&
      !_.find(syllabus.teachers, { _id: user._id }) && req.user.auth !== "manager"
    ) {
      // 승인이 완료된 강의계획서는 수정할 수 없다.
      if (isFullyConfirmed(syllabus)) {
        return res.status(403).send({
          message: SYLLABUS_CONFIRMED_ALREADY,
        });
      }
      // 수강생이 있는 경우 수정할 수 없다.
      if (syllabus.count > 0) {
        return res.status(403).send({
          message: SYLLABUS_ENROLLED_ALREADY,
        });
      }

      /* 강의실 중복 확인 */
      if (
        (isUpdated["time"] || isUpdated["classroom"]) &&
        !(await isClassroomAvailable(
          user.academyId,
          syllabus.season,
          req.body.classroom,
          req.body.time,
          syllabus
        ))
      ) {
        return res.status(409).send({ message: CLASSROOM_IN_USE });
      }

      /* 수정 */
      for (let field of fields) {
        syllabus[field] = req.body[field];
      }
      await syllabus.save();

      return res.status(200).send({ syllabus });
    }

    /* 2. user가 syllabus 지도교사인 경우 */
    if (_.find(syllabus.teachers, { _id: user._id }) || req.user.auth === "manager") {
      /* 2-1. 수강생이 없는 경우 */
      if (syllabus.count === 0) {
        /* 강의실 중복 확인 */
        if (
          (isUpdated["time"] || isUpdated["classroom"]) &&
          !(await isClassroomAvailable(
            user.academyId,
            syllabus.season,
            req.body.classroom,
            req.body.time,
            syllabus
          ))
        ) {
          return res.status(409).send({ message: CLASSROOM_IN_USE });
        }
        /* 수정 */
        for (let field of fields) {
          syllabus[field] = req.body[field];
        }
        await syllabus.save();

        return res.status(200).send({ syllabus });
      }

      /* 2-2. 수강생이 있는 경우 */
      /* 강의실&시간 변경 확인 */
      if (isUpdated["time"] || isUpdated["classroom"]) {
        return res.status(409).send({ message: SYLLABUS_ENROLLED_ALREADY });
      }

      /* 수강정원 초과 확인 */
      if (
        isUpdated["limit"] &&
        req.body.limit !== 0 &&
        req.body.limit < syllabus.count
      ) {
        return res.status(409).send({ message: SYLLABUS_COUNT_EXCEEDS_LIMIT });
      }

      const enrollments = await Enrollment(user.academyId).find({
        syllabus: syllabus._id,
      });

      /* 수정 (subject 제외) */
      for (let field of fields) {
        if (field === "subject") continue;
        syllabus[field] = req.body[field];
      }

      await Promise.all(
        enrollments.map((e) => {
          for (let field of fields) {
            e[field] = syllabus[field];
          }
          return e.save();
        })
      );

      await syllabus.save();
      return res.status(200).send({ syllabus });
    }

    return res.status(403).send({
      message: PERMISSION_DENIED,
    });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.SyllabusAPI
 * @function USyllabusSubject API
 * @description 강의계획서 교과목 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/syllabuses/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 * @param {string[]} req.body.subject
 *
 * @param {Object} res
 * @param {Object} res.syllabus - updated syllabus
 * @param {Object} res.changes - changes in enrollments.evaluation
 *
 */
export const updateSubject = async (req, res) => {
  try {
    if (!("subject" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("subject") });
    }

    const user = req.user;

    const syllabus = await Syllabus(user.academyId).findById(req.params._id);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    // subject가 변경되었는지 확인
    const isUpdated = !_.isEqual(syllabus.subject, req.body.subject);
    if (!isUpdated) return res.status(200).send({ syllabus });

    /* 권한 확인 */
    const registration = await Registration(user.academyId).findOne({
      user: user._id,
      season: syllabus.season,
    });
    if (!registration) {
      return res.status(404).send({ message: __NOT_FOUND("registration") });
    }
    if (!registration?.permissionSyllabusV2) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // user가 syllabus 지도교사인지 확인
    if (!_.find(syllabus.teachers, { _id: user._id }) && req.user.auth !== "manager") {
      return res.status(403).send({
        message: PERMISSION_DENIED,
      });
    }

    const enrollments = await Enrollment(user.academyId)
      .find({
        syllabus: syllabus._id,
      })
      .select("+evaluation");

    const newSubject = req.body.subject;
    syllabus["subject"] = newSubject;

    const updates = [];
    const changes = [];

    // evaluation 동기화
    for (let enrollment of enrollments) {
      enrollment.subject = newSubject;
      const change = {
        labels: [],
        before: [],
        after: [],
      };

      const exEnrollmentsByYear = await Enrollment(user.academyId)
        .find({
          _id: { $ne: enrollment._id },
          school: enrollment.school,
          year: enrollment.year,
          student: enrollment.student,
          subject: enrollment.subject,
        })
        .select("+evaluation");

      const exEnrollmentsByTerm = _.filter(
        exEnrollmentsByYear,
        (_enrollment) => _enrollment.term === enrollment.term
      );

      let isUpdatedByTerm = false;
      let isUpdatedByYear = false;

      for (let obj of registration.formEvaluation) {
        // term으로 묶이는 평가 항목
        if (obj.combineBy === "term" && exEnrollmentsByTerm.length > 0) {
          // 변경되는 교과목의 기존 평가 사항이 있는 경우
          if (
            exEnrollmentsByTerm[0].evaluation &&
            exEnrollmentsByTerm[0].evaluation[obj.label] &&
            exEnrollmentsByTerm[0].evaluation[obj.label] !== ""
          ) {
            change.labels.push(obj.label);
            change.before.push(enrollment.evaluation[obj.label] ?? "");
            change.after.push(exEnrollmentsByTerm[0].evaluation[obj.label]);

            Object.assign(enrollment.evaluation || {}, {
              [obj.label]: exEnrollmentsByTerm[0].evaluation[obj.label],
            });
          }
          // 변경 전 평가 사항이 있는 경우
          else if (
            enrollment.evaluation[obj.label] &&
            enrollment.evaluation[obj.label] !== ""
          ) {
            for (let e of exEnrollmentsByTerm) {
              Object.assign(e.evaluation || {}, {
                [obj.label]: enrollment.evaluation[obj.label],
              });
            }
            isUpdatedByTerm = true;
          }
        }

        // year로 묶이는 평가 항목
        else if (obj.combineBy === "year" && exEnrollmentsByYear.length > 0) {
          // 변경되는 교과목의 기존 평가 사항이 있는 경우
          if (
            exEnrollmentsByYear[0].evaluation &&
            exEnrollmentsByYear[0].evaluation[obj.label] &&
            exEnrollmentsByYear[0].evaluation[obj.label] !== ""
          ) {
            change.labels.push(obj.label);
            change.before.push(enrollment.evaluation[obj.label] ?? "");
            change.after.push(exEnrollmentsByYear[0].evaluation[obj.label]);

            Object.assign(enrollment.evaluation || {}, {
              [obj.label]: exEnrollmentsByYear[0].evaluation[obj.label],
            });
          }
          // 변경 전 평가 사항이 있는 경우
          else if (
            enrollment.evaluation[obj.label] &&
            enrollment.evaluation[obj.label] !== ""
          ) {
            for (let e of exEnrollmentsByTerm)
              Object.assign(e.evaluation || {}, {
                [obj.label]: enrollment.evaluation[obj.label],
              });
            for (let e of exEnrollmentsByYear) {
              Object.assign(e.evaluation || {}, {
                [obj.label]: enrollment.evaluation[obj.label],
              });
            }
            isUpdatedByYear = true;
          }
        }
      }

      if (change.labels.length > 0) {
        changes.push({
          student: enrollment.student,
          studentId: enrollment.studentId,
          studentName: enrollment.studentName,
          ...change,
        });
      }

      updates.push(enrollment);
      if (isUpdatedByTerm && !isUpdatedByYear) {
        updates.push(...exEnrollmentsByTerm);
      } else if (isUpdatedByYear) {
        updates.push(...exEnrollmentsByYear);
      }
    }

    // save documents
    await syllabus.save();
    await Promise.all(updates.map((e) => e.save()));

    return res.status(200).send({ syllabus, changes });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.SyllabusAPI
 * @function UHideSyllabusFromCalendar API
 * @description 캘린더(개별 지도 수업)에서 숨김 설정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/syllabuses/:_id/hide"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 *
 */
export const hideFromCalendar = async (req, res) => {
  try {
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.params._id
    );
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    const idx = _.findIndex(syllabus.teachers, (teacher) =>
      teacher._id.equals(req.user._id)
    );
    if (idx === -1) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    syllabus.teachers[idx].isHiddenFromCalendar = true;
    await syllabus.save();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.SyllabusAPI
 * @function UShowSyllabusOnCalendar API
 * @description 캘린더(개별 지도 수업)에서 조회 설정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/syllabuses/:_id/show"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 *
 */
export const showOnCalendar = async (req, res) => {
  try {
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.params._id
    );
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    const idx = _.findIndex(syllabus.teachers, (teacher) =>
      teacher._id.equals(req.user._id)
    );
    if (idx === -1) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    syllabus.teachers[idx].isHiddenFromCalendar = false;
    await syllabus.save();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.SyllabusAPI
 * @function DSyllabus API
 * @description 강의계획서 삭제 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/syllabuses/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 403    | SYLLABUS_ENROLLED_ALREADY | if syllabus has at least one enrollment |
 *
 */
export const remove = async (req, res) => {
  try {
    const user = req.user;

    const syllabus = await Syllabus(req.user.academyId).findById(
      req.params._id
    );
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    /* 권한 확인 */
    const registration = await Registration(user.academyId).findOne({
      user: user._id,
      season: syllabus.season,
    });
    if (!registration) {
      return res.status(404).send({ message: __NOT_FOUND("registration") });
    }
    if (!registration?.permissionSyllabusV2) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    /* 1. user가 syllabus 작성자이고 지도교사가 아닌 경우 */
    if (
      user._id.equals(syllabus.user) &&
      !_.find(syllabus.teachers, { _id: user._id }) && req.user.auth !== "manager"
    ) {
      // 수강생이 있는 경우 삭제할 수 없다
      if (syllabus.count > 0) {
        return res.status(403).send({
          message: SYLLABUS_ENROLLED_ALREADY,
        });
      }

      await syllabus.delete();
      return res.status(200).send({});
    }

    /* 2. user가 syllabus 지도교사인 경우 */
    if (_.find(syllabus.teachers, { _id: user._id }) || req.user.auth === "manager") {
      await Enrollment(user.academyId).deleteMany({
        syllabus: syllabus._id,
      });

      await syllabus.delete();
      return res.status(200).send({});
    }

    return res.status(403).send({
      message: PERMISSION_DENIED,
    });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};
