/**
 * @title Version 4
 * @subTitle Add field 'permissionEvaluationV2', 'formEvaluation' in registration
 *
 * @description
 * Use registration.permissionEvaluationV2 to validate permission
 * Use registration.formEvaluation to sync evaluation
 * Optimize evaluation sync algorithm
 *
 */
import { logger } from "../log/logger.js";
import { Enrollment, Syllabus, Registration } from "../models/index.js";
import _ from "lodash";

/* promise queue library */
import PQueue from "p-queue";

// create a new queue, and pass how many you want to exec at once
const queue = new PQueue({ concurrency: 1 });

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

async function queueEnroll(req) {
  return queue.add(() => exec(req));
}

const exec = async (req) => {
  try {
    const _Enrollment = Enrollment(req.user.academyId);

    // 1. syllabus 조회
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.body.syllabus
    );
    if (!syllabus) {
      const err = new Error("수업 정보를 찾을 수 없습니다.");
      err.status = 404;
      throw err;
    }

    // 2. 이미 신청한 수업인지 확인
    const exEnrollments = await _Enrollment.find({
      student: req.user._id,
      season: syllabus.season,
    });
    if (_.find(exEnrollments, { syllabus: syllabus._id })) {
      const err = new Error("이미 신청한 수업입니다.");
      err.status = 409;
      throw err;
    }

    // 3. 수강정원 확인
    if (syllabus.limit !== 0 && syllabus.count >= syllabus.limit) {
      const err = new Error("수강정원이 다 찼습니다.");
      err.status = 409;
      throw err;
    }

    // 4. 수강신청 가능한 시간인가?
    if (isTimeOverlapped(exEnrollments, syllabus)) {
      const err = new Error("시간표가 중복되었습니다.");
      err.status = 409;
      throw err;
    }

    /* 5~8단계는 요청이 들어온 시점에서 이미 검증되었을 가능성이 높음 */

    // 5. 승인된 수업인지 확인
    for (let i = 0; i < syllabus.teachers.length; i++) {
      if (!syllabus.teachers[i].confirmed) {
        const err = new Error("승인되지 않은 수업입니다.");
        err.status = 409;
        throw err;
      }
    }

    // 6. registration 조회
    const registration = await Registration(req.user.academyId).findById(
      req.body.registration
    );
    if (!registration) {
      const err = new Error("등록 정보를 찾을 수 없습니다.");
      err.status = 404;
      throw err;
    }
    if (!req.user._id.equals(registration.user)) {
      const err = new Error("유저 정보와 등록 정보가 일치하지 않습니다.");
      err.status = 401;
      throw err;
    }

    // 7. 권한 검사
    if (!registration?.permissionEnrollmentV2) {
      const err = new Error("수강신청 권한이 없습니다.");
      err.status = 401;
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

export const enroll = async (req, res) => {
  try {
    if (!("syllabus" in req.body) || !("registration" in req.body)) {
      return res.status(400).send({ message: "invalud request" });
    }

    await queueEnroll(req, res);
    return res.status(200).send({});
  } catch (err) {
    if (err?.status !== 500) {
      return res.status(err.status).send({ message: err.message });
    }
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
