/**
 * EnrollmentAPI namespace
 * @namespace APIs.EnrollmentAPI
 * @see TEnrollment in {@link Models.Enrollment}
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
    else if (_.find(syllabus.teachers, { _id: req.user._id }) || req.user.auth === "manager") {
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
    // 다른 시즌에 같은 수업이 있는 경우
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
    // 같은 시즌에 같은 수업이 있는 경우
    const eTerm = _.find(exEnrollments, (e) =>
      _.isEqual(enrollment.subject, e.subject)
    );
    if (eTerm) {
      for (let obj of registration.formEvaluation) {
        enrollment.evaluation[obj.label] = eTerm.evaluation[obj.label] || "";
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
 * @memberof APIs.EnrollmentAPI
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

/**
 * @memberof APIs.EnrollmentAPI
 * @function REnrollments API
 * @description 수강 정보 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/enrollments"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.syllabus - ObjectId of syllabus
 * @param {string?} req.query.season - ObjectId of season
 * @param {string?} req.query.student - ObjectId of student
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object[]} res.enrollments
 *
 */

/**
 * @memberof APIs.EnrollmentAPI
 * @function REnrollment API
 * @description 수강 정보 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/enrollments/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object} res.enrollment
 *
 */
export const find = async (req, res) => {
  try {
    if (req.params._id) {
      const enrollment = await Enrollment(req.user.academyId).findById(
        req.params._id
      );
      if (!enrollment) {
        return res.status(404).send({ message: __NOT_FOUND("enrollment") });
      }

      if (!enrollment.student.equals(req.user._id)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }

      const registration = await Registration(req.user.academyId).findOne({
        season: enrollment.season,
        user: req.user._id,
      });
      if (!registration) {
        return res.status(404).send({ message: __NOT_FOUND("registration") });
      }
      const evaluation = {};
      for (let item of registration.formEvaluation) {
        if (item.auth.view.student) {
          evaluation[item.label] = enrollment.evaluation[item.label];
        }
      }
      enrollment.evaluation = evaluation;

      return res.status(200).send({ enrollment });
    }

    const query = {};
    if ("syllabus" in req.query) {
      query["syllabus"] = req.query.syllabus;
    }
    if ("season" in req.query) {
      query["season"] = req.query.season;
    }
    if ("student" in req.query) {
      query["student"] = req.query.student;
    }

    const enrollments = await Enrollment(req.user.academyId)
      .find(query)
      .select("-evaluation");

    return res.status(200).send({ enrollments });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.EnrollmentAPI
 * @function REnrollmentsWithEvaluation API
 * @description 평가 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/enrollments/evaluations"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.syllabus - ObjectId of syllabus
 * @param {string?} req.query.school - ObjectId of school
 * @param {string?} req.query.student - ObjectId of student
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Object[]} res.enrollments
 * @param {Object?} res.syllabus - if req.query.syllabus is used
 *
 */
export const findEvaluations = async (req, res) => {
  try {
    if ("syllabus" in req.query) {
      const syllabus = await Syllabus(req.user.academyId).findById(
        req.query.syllabus
      );
      if (!syllabus) {
        return res.status(404).send({ message: __NOT_FOUND("syllabus") });
      }

      if (!_.find(syllabus.teachers, { _id: req.user._id }) && req.user.auth !== "manager") {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
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
    if ("school" in req.query && "student" in req.query) {
      if (
        !(await Registration(req.user.academyId).findOne({
          user: req.user._id,
          role: "teacher",
        }))
      ) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }

      const enrollments = await Enrollment(req.user.academyId)
        .find({ school: req.query.school, student: req.query.student })
        .select("-info");
      return res.status(200).send({ enrollments });
    }
    return res.status(403).send({ message: PERMISSION_DENIED });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.EnrollmentAPI
 * @function UEvaluation API
 * @description 평가 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/enrollments/:_id/evaluation"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 * @param {Object} req.body.evaluation
 *
 * @param {Object} res
 *
 */
export const updateEvaluation = async (req, res) => {
  try {
    if (!("evaluation" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("evaluation") });
    }

    const enrollment = await Enrollment(req.user.academyId).findById(
      req.params._id
    );
    if (!enrollment) {
      return res.status(404).send({ message: __NOT_FOUND("enrollment") });
    }

    let byMentor = false;
    let byStudent = false;
    if (_.find(enrollment.teachers, { _id: req.user._id }) || req.user.auth === "manager") {
      byMentor = true;
    }
    if (enrollment.student.equals(req.user._id)) {
      byStudent = true;
    }
    if (!byMentor && !byStudent) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 유저 권한 확인
    const registration = await Registration(req.user.academyId).findOne({
      season: enrollment.season,
      user: req.user._id,
    });
    if (!registration) {
      return res.status(404).send({ message: __NOT_FOUND("registration") });
    }
    if (!registration.permissionEvaluationV2) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

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

    for (let label in req.body.evaluation) {
      const obj = _.find(registration.formEvaluation, { label });
      if (
        (byMentor && obj?.auth.edit["teacher"]) ||
        (byStudent && obj?.auth.edit["student"])
      ) {
        enrollment.evaluation = {
          ...enrollment.evaluation,
          [label]: req.body.evaluation[label],
        };
        if (obj.combineBy === "term") {
          for (let e of enrollmentsByTerm)
            Object.assign(e.evaluation || {}, {
              [label]: req.body.evaluation[label],
            });
        } else {
          for (let e of enrollmentsByTerm)
            Object.assign(e.evaluation || {}, {
              [label]: req.body.evaluation[label],
            });
          for (let e of enrollmentsByYear)
            Object.assign(e.evaluation || {}, {
              [label]: req.body.evaluation[label],
            });
        }
      }
    }

    /* save documents */
    for (let e of [enrollment, ...enrollmentsByTerm, ...enrollmentsByYear]) {
      await e.save();
    }

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.EnrollmentAPI
 * @function UEnrollmentMemo API
 * @description 수강 정보 메모 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/enrollments/:_id/memo"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 * @param {string} req.body.memo
 *
 * @param {Object} res
 *
 */
export const updateMemo = async (req, res) => {
  try {
    if (!("memo" in req.body)) {
      return re.status(400).send({ message: FIELD_REQUIRED("memo") });
    }
    const enrollment = await Enrollment(req.user.academyId).findById(
      req.params._id
    );
    if (!enrollment) {
      return res.status(404).send({ message: __NOT_FOUND("enrollment") });
    }
    if (!enrollment.student.equals(req.user._id)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    enrollment.memo = req.body.memo;
    await enrollment.save();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.EnrollmentAPI
 * @function UHideEnrollmentFromCalendar API
 * @description 캘린더(수강 중인 수업)에서 숨김 설정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/enrollments/:_id/hide"} req.url
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
    const enrollment = await Enrollment(req.user.academyId).findById(
      req.params._id
    );
    if (!enrollment) {
      return res.status(404).send({ message: __NOT_FOUND("enrollment") });
    }
    if (!enrollment.student.equals(req.user._id)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    enrollment.isHiddenFromCalendar = true;
    await enrollment.save();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.EnrollmentAPI
 * @function UShowEnrollmentOnCalendar API
 * @description 캘린더(수강 중인 수업)에서 조회 설정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/enrollments/:_id/show"} req.url
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
    const enrollment = await Enrollment(req.user.academyId).findById(
      req.params._id
    );
    if (!enrollment) {
      return res.status(404).send({ message: __NOT_FOUND("enrollment") });
    }
    if (!enrollment.student.equals(req.user._id)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    enrollment.isHiddenFromCalendar = false;
    await enrollment.save();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.EnrollmentAPI
 * @function DEnrollment API
 * @description 수강 취소 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/enrollments/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 *
 */
export const remove = async (req, res) => {
  try {
    const enrollment = await Enrollment(req.user.academyId).findById(
      req.params._id
    );

    if (!enrollment) {
      return res.status(404).send({ message: __NOT_FOUND("enrollment") });
    }

    if (
      !enrollment.student.equals(req.user._id) &&
      !_.find(enrollment.teachers, { _id: req.user._id }) && req.user.auth !== "manager") {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const registration = await Registration(req.user.academyId).findOne({
      season: enrollment.season,
      user: req.user._id,
    });
    if (!registration) {
      return res.status(404).send({ message: __NOT_FOUND("registration") });
    }
    if (!registration.permissionEnrollmentV2) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    await enrollment.remove();
    await Syllabus(req.user.academyId).findByIdAndUpdate(enrollment.syllabus, {
      $inc: { count: -1 },
    });

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
