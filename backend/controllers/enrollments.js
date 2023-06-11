/**
 * EnrollmentAPI namespace
 * @namespace APIs.EnrollmentAPI
 */

import { Enrollment, Syllabus, Registration } from "../models/index.js";
import { getIoEnrollment } from "../utils/webSocket.js";
import { logger } from "../log/logger.js";
import PQueue from "p-queue";
import _ from "lodash";
import {
  FIELD_INVALID,
  FIELD_IN_USE,
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  STUDENTS_FULL,
  SYLLABUS_NOT_CONFIRMED,
  TIME_DUPLICATED,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * @memberof APIs.EnrollmentAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | ENROLLMENT_NOT_FOUND | if enrollment is not found  |
 */

const isTimeOverlapped = (enrollments, syllabus) => {
  const unavailableTime = _.flatten(
    enrollments.map((enrollment) => enrollment.time)
  );
  const unavailableTimeLabels = _([...unavailableTime, ...syllabus.time])
    .groupBy((x) => x.label)
    .pickBy((x) => x.length > 1)
    .keys()
    .value();
  return unavailableTimeLabels.length != 0;
};

// create a new queue, and pass how many you want to exec at once
const queue = new PQueue({ concurrency: 1 });

let taskRequested = 0;
let taskCompleted = 0;
let taskActivated = 0;

// active event handler
queue.on("active", () => {
  taskActivated += 1;
  // console.log(`Task #${taskActivated} is activated`);
});

// next event(task completed normally or with an error) handler
queue.on("next", () => {
  taskCompleted += 1;
  // console.log(`Task #${taskCompleted} is completed`);
});

// Add task to the queue.
async function queueEnroll(req) {
  return queue.add(() => exec(req));
}

// Exec CEnrollment
const exec = async (req) => {
  try {
    const _Enrollment = Enrollment(req.user.academyId);

    // 1. syllabus 조회
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.body.syllabus
    );
    if (!syllabus) {
      const err = new Error(__NOT_FOUND("syllabus"));
      err.status = 404;
      throw err;
    }

    // 2. registration 조회
    const registration = await Registration(req.user.academyId).findById(
      req.body.registration
    );
    if (!registration) {
      const err = new Error(__NOT_FOUND("registration"));
      err.status = 404;
      throw err;
    }

    // 3. 이미 신청한 수업인지 확인
    const exEnrollments = await _Enrollment.find({
      student: registration.user,
      season: syllabus.season,
    });
    if (_.find(exEnrollments, { syllabus: syllabus._id })) {
      const err = new Error(FIELD_IN_USE("enrollment"));
      err.status = 409;
      throw err;
    }

    // 4. 수강정원 확인
    if (syllabus.limit !== 0 && syllabus.count >= syllabus.limit) {
      const err = new Error(STUDENTS_FULL);
      err.status = 409;
      throw err;
    }

    // 5. 수강신청 가능한 시간인가?
    if (isTimeOverlapped(exEnrollments, syllabus)) {
      const err = new Error(TIME_DUPLICATED);
      err.status = 409;
      throw err;
    }

    /* 6~8단계는 요청이 들어온 시점에서 이미 검증되었을 가능성이 높음 */

    // 6. 승인된 수업인지 확인
    for (let i = 0; i < syllabus.teachers.length; i++) {
      if (!syllabus.teachers[i].confirmed) {
        const err = new Error(SYLLABUS_NOT_CONFIRMED);
        err.status = 409;
        throw err;
      }
    }

    // 7. 권한 검사

    // 7-1. 사용자가 수강신청을 직접 하는 경우
    if (req.user._id.equals(registration.user)) {
      if (!registration.permissionEnrollmentV2) {
        const err = new Error(PERMISSION_DENIED);
        err.status = 403;
        throw err;
      }
    }
    // 7-2. 멘토가 수강생을 초대하는 경우
    else if (_.find(syllabus.teachers, { _id: req.user._id })) {
      const teacherRegistration = await Registration(
        req.user.academyId
      ).findOne({ season: syllabus.season, user: req.user._id });
      if (!teacherRegistration) {
        const err = new Error(__NOT_FOUND("teacherRegistration"));
        err.status = 404;
        throw err;
      }
      if (!teacherRegistration.permissionEnrollmentV2) {
        const err = new Error(PERMISSION_DENIED);
        err.status = 403;
        throw err;
      }
    }
    // 7-3. 모두 아닌 경우
    else {
      const err = new Error(PERMISSION_DENIED);
      err.status = 403;
      throw err;
    }

    // 8. 수강신청 완료 (enrollment 생성)
    const enrollment = new _Enrollment({
      ...syllabus.getSubdocument(),
      student: registration.user,
      studentId: registration.userId,
      studentName: registration.userName,
      studentGrade: registration.grade,
    });

    // 9. evaluation 동기화
    enrollment.evaluation = {};
    if (exEnrollments.length === 0) {
      const eYear = await _Enrollment.findOne({
        school: enrollment.school,
        year: enrollment.year,
        student: enrollment.student,
        subject: enrollment.subject,
      });
      if (eYear) {
        for (let obj of registration.formEvaluation) {
          if (obj.combineBy === "year") {
            enrollment.evaluation[obj.label] =
              eYear.evaluation[obj.label] || "";
          }
        }
      }
    } else {
      const eTerm = _.find(exEnrollments, (e) =>
        _.isEqual(enrollment.subject, e.subject)
      );
      if (eTerm) {
        for (let obj of registration.formEvaluation) {
          enrollment.evaluation[obj.label] = eTerm.evaluation[obj.label] || "";
        }
      }
    }
    await enrollment.save();
    syllabus.count = syllabus.count + 1;
    await syllabus.save();
  } catch (err) {
    throw err;
  }
};

export const getTaskCompleted = () => {
  return taskCompleted;
};

export const getTaskRequested = () => {
  return taskRequested;
};

/**
 * @memberof APIs.RegistrationAPI
 * @function CEnrollment API
 * @description 수강신청 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/enrollments"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 * @param {string} req.body.syllabus - ObjectId of syllabus
 * @param {string} req.body.registration - ObjectId of registration
 * @param {string?} req.body.socketId
 *
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | ENROLLMENT_IN_USE | if enrollment is already made  |
 * | 409    | STUDENTS_FULL | if syllabus.limit!==0 and syllabus.count>=syllabus.limit  |
 * | 409    | TIME_DUPLICATED | if time is duplicated  |
 *
 */
export const enroll = async (req, res) => {
  try {
    for (let field of ["syllabus", "registration"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const taskIdx = ++taskRequested;
    // console.log(
    //   `Task ${taskIdx} is requested; Your waiting order is ${
    //     taskIdx - taskCompleted
    //   }`
    // );

    // send waiting order to user with socket
    if ("socketId" in req.body && taskIdx - taskCompleted > 10) {
      getIoEnrollment()
        .to(req.body.socketId)
        .emit("responseWaitingOrder", {
          waitingOrder: taskIdx - taskCompleted,
          waitingBehind: 0,
          taskIdx,
        });
    }

    try {
      await queueEnroll(req, res);
    } catch (err) {
      return res.status(err.status).send({ message: err.message });
    }
    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const find = async (req, res) => {
  try {
    // find by enrollment _id (only student can view)
    if (req.params._id) {
      const enrollment = await Enrollment(req.user.academyId).findById(
        req.params._id
      );
      if (!enrollment)
        return res.status(404).send({ message: "enrollment not found" });

      // if (enrollment.studentId != req.user.userId)
      //   return res.status(401).send(); 임시적으로 권한 허용

      return res.status(200).send(enrollment);
    }

    const { season, year, student, studentId, syllabus, syllabuses } =
      req.query;

    // find by season & studentId (deprecated)
    if (season && studentId) {
      const enrollments = await Enrollment(req.user.academyId).find({
        season,
        studentId,
      });
      //  .select("-evaluation"); 임시적으로 권한 허용
      return res.status(200).send({ enrollments });
    }

    // find by season & studentId
    if (season && student) {
      const enrollments = await Enrollment(req.user.academyId).find({
        season,
        student,
      });
      //  .select("-evaluation"); 임시적으로 권한 허용
      return res.status(200).send({ enrollments });
    }

    if (year && studentId) {
      //deprecated
      const enrollments = await Enrollment(req.user.academyId).find({
        year,
        studentId,
      });
      //   .select("-evaluation"); // 임시적으로 권한 허용
      return res.status(200).send({ enrollments });
    }

    if (year && student) {
      //deprecated
      const enrollments = await Enrollment(req.user.academyId).find({
        year,
        student,
      });
      //   .select("-evaluation"); // 임시적으로 권한 허용
      return res.status(200).send({ enrollments });
    }

    if (studentId) {
      //deprecated
      const enrollments = await Enrollment(req.user.academyId).find({
        studentId,
      });
      //  .select("-evaluation"); 임시적으로 권한 허용
      return res.status(200).send({ enrollments });
    }

    if (student) {
      const enrollments = await Enrollment(req.user.academyId).find({
        student,
      });
      //  .select("-evaluation"); 임시적으로 권한 허용
      return res.status(200).send({ enrollments });
    }

    // find by syllabus
    if (syllabus) {
      const enrollments = await Enrollment(req.user.academyId)
        .find({ syllabus })
        .select([
          "student",
          "studentId",
          "studentName",
          "studentGrade",
          "createdAt",
        ]);
      return res.status(200).send({ enrollments });
    }

    // find by multiple syllabuses
    if (syllabuses) {
      const enrollments = await Enrollment(req.user.academyId)
        .find({ syllabus: { $in: syllabuses.split(",") } })
        .select("syllabus");

      return res.status(200).send({ enrollments });
    }
    return res.status(400).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const findEvaluations = async (req, res) => {
  try {
    // evaluation 가져오는 권한 설정 필요
    // if (req.user.userId != studentId) return res.status(401).send();

    if (req.query.syllabus) {
      const syllabus = await Syllabus(req.user.academyId).findById(
        req.query.syllabus
      );
      if (!syllabus)
        return res.status(404).send({ message: "syllabus not found" });

      const enrollments = await Enrollment(req.user.academyId)
        .find({
          syllabus: req.query.syllabus,
        })
        .select(["-info"]);

      return res.status(200).send({
        syllabus: syllabus.getSubdocument(),
        enrollments: enrollments.map((e) => {
          return {
            _id: e._id,
            student: e.student,
            studentId: e.studentId,
            studentName: e.studentName,
            studentGrade: e.studentGrade,
            evaluation: e.evaluation,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          };
        }),
      });
    }

    const enrollments = await Enrollment(req.user.academyId)
      .find(req.query)
      .select("-info");
    return res.status(200).send({ enrollments });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const updateEvaluation2 = async (req, res) => {
  try {
    if (req.query.by !== "mentor" && req.query.by !== "student")
      return res
        .status(400)
        .send({ message: `req.query.by is ${req.query.by}` });

    const enrollment = await Enrollment(req.user.academyId).findById(
      req.params._id
    );
    if (!enrollment)
      return res.status(404).send({ message: "enrollment not found" });

    if (
      (req.query.by === "mentor" &&
        !_.find(enrollment.teachers, { _id: req.user._id })) ||
      (req.query.by === "student" && !enrollment.student.equals(req.user._id))
    )
      return res.status(401).send({
        message: "you are not a mentor or student of this enrollment",
      });

    // 유저 권한 확인
    const registration = await Registration(req.user.academyId).findOne({
      season: enrollment.season,
      user: req.user._id,
    });
    if (!registration)
      return res.status(404).send({ message: "registration not found" });

    if (!registration?.permissionEvaluationV2)
      return res.status(409).send({ message: "you have no permission" });

    const enrollmentsByTerm = await Enrollment(req.user.academyId)
      .find({
        _id: { $ne: enrollment._id },
        season: enrollment.season,
        student: enrollment.student,
        subject: enrollment.subject,
      })
      .select("+evaluation");

    const enrollmentsByYear = await Enrollment(req.user.academyId)
      .find({
        _id: { $ne: enrollment._id },
        school: enrollment.school,
        year: enrollment.year,
        term: { $ne: enrollment.term },
        student: enrollment.student,
        subject: enrollment.subject,
      })
      .select("+evaluation");

    for (let label in req.body.new) {
      const obj = _.find(registration.formEvaluation, { label });
      if (obj.auth.edit[req.query.by === "mentor" ? "teacher" : "student"]) {
        enrollment.evaluation = {
          ...enrollment.evaluation,
          [label]: req.body.new[label],
        };
        if (obj.combineBy === "term") {
          for (let e of enrollmentsByTerm)
            Object.assign(e.evaluation || {}, { [label]: req.body.new[label] });
        } else {
          for (let e of enrollmentsByTerm)
            Object.assign(e.evaluation || {}, { [label]: req.body.new[label] });
          for (let e of enrollmentsByYear)
            Object.assign(e.evaluation || {}, { [label]: req.body.new[label] });
        }
      }
    }

    /* save documents */
    for (let e of [enrollment, ...enrollmentsByTerm, ...enrollmentsByYear]) {
      await e.save();
    }
    // await Promise.all([
    //   [enrollment, ...enrollmentsByTerm, ...enrollmentsByYear].map(
    //     (e) => e.save
    //   ),
    // ]);

    return res.status(200).send(enrollment);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const updateMemo = async (req, res) => {
  try {
    const enrollment = await Enrollment(req.user.academyId).findById(
      req.params._id
    );
    if (!enrollment)
      return res.status(404).send({ message: "enrollment not found" });

    if (!enrollment.student.equals(req.user._id))
      return res
        .status(409)
        .send({ message: "you cannot edit memo of this enrollment" });

    enrollment.memo = req.body.memo;
    await enrollment.save();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const hideFromCalendar = async (req, res) => {
  try {
    const enrollment = await Enrollment(req.user.academyId).findById(
      req.params._id
    );
    if (!enrollment)
      return res.status(404).send({ message: "enrollment not found" });

    if (!enrollment.student.equals(req.user._id))
      return res
        .status(409)
        .send({ message: "you cannot edit memo of this enrollment" });

    enrollment.isHiddenFromCalendar = true;
    await enrollment.save();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const showOnCalendar = async (req, res) => {
  try {
    const enrollment = await Enrollment(req.user.academyId).findById(
      req.params._id
    );
    if (!enrollment)
      return res.status(404).send({ message: "enrollment not found" });

    if (!enrollment.student.equals(req.user._id))
      return res
        .status(409)
        .send({ message: "you cannot edit memo of this enrollment" });

    enrollment.isHiddenFromCalendar = false;
    await enrollment.save();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    if (req.params._id) {
      const enrollment = await Enrollment(req.user.academyId).findById(
        req.params._id
      );

      if (!enrollment)
        return res.status(404).send({ message: "enrollment not found" });

      if (req.user.auth === "member" && enrollment.studentId != req.user.userId)
        return res.status(401).send();

      // 유저 권한 확인

      const registration = await Registration(req.user.academyId).findOne({
        season: enrollment.season,
        user: enrollment.student,
      });
      if (!registration) {
        return res
          .status(404)
          .send({ message: "등록 정보를 찾을 수 없습니다." });
      }
      if (!registration?.permissionEnrollmentV2)
        return res.status(401).send({ message: "you have no permission" });

      await enrollment.remove();
      await Syllabus(req.user.academyId).findByIdAndUpdate(
        enrollment.syllabus,
        {
          $inc: { count: -1 },
        }
      );

      return res.status(200).send();
    }

    if (req.query._ids) {
      const _idList = _.split(req.query._ids, ",");

      const enrollments = await Enrollment(req.user.academyId).find({
        _id: { $in: _idList },
      });
      if (enrollments.length === 0)
        return res.status(404).send({ message: "enrollments not found" });

      for (let e of enrollments) {
        if (!e.syllabus.equals(enrollments[0].syllabus))
          return res.status(409).send({
            message: "enrollments are mixed",
          });
      }

      const syllabus = await Syllabus(req.user.academyId).findById(
        enrollments[0].syllabus
      );
      if (!syllabus)
        return res
          .status(404)
          .send({ message: "수업 정보를 찾을 수 없습니다." });

      // mentor 확인
      let isMentor = false;
      for (let teacher of syllabus.teachers) {
        if (teacher._id.equals(req.user._id)) {
          isMentor = true;
          break;
        }
      }
      if (!isMentor)
        return res
          .status(403)
          .send({ message: "수업 초대 취소 권한이 없습니다." });

      const { deletedCount } = await Enrollment(req.user.academyId).deleteMany({
        _id: { $in: _idList },
      });
      await Syllabus(req.user.academyId).findByIdAndUpdate(
        enrollments[0].syllabus,
        {
          $inc: { count: -1 * deletedCount },
        }
      );
      return res.status(200).send({});
    }
    return res.status(400).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
