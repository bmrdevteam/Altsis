/**
 * @title Version 0
 * @subTitle Enroll without queue
 *
 * @description
 * 500 Error(duplicate key error)
 * timetable conflict
 *
 */
import { logger } from "../../../log/logger.js";
import {
  Enrollment,
  Syllabus,
  Registration,
  Season,
} from "../../../models/index.js";
import _ from "lodash";

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

export const enroll = async (req, res) => {
  try {
    const _Enrollment = Enrollment(req.user.academyId);

    // 1. syllabus 조회
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.body.syllabus
    );
    if (!syllabus) {
      return res.status(404).send({ message: "수업 정보를 찾을 수 없습니다." });
    }

    // 2. registration 조회
    const registration = await Registration(req.user.academyId).findById(
      req.body.registration
    );
    if (!registration) {
      return res.status(404).send({ message: "등록 정보를 찾을 수 없습니다." });
    }
    if (!req.user._id.equals(registration.user)) {
      return res
        .status(401)
        .send({ message: "유저 정보와 등록 정보가 일치하지 않습니다." });
    }

    // 3. season 조회
    const season = await Season(req.user.academyId).findById(syllabus.season);
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }

    // 4. 권한 검사
    if (
      !season.checkPermission(
        "enrollment",
        registration.userId,
        registration.role
      )
    ) {
      return res.status(401).send({ message: "수강신청 권한이 없습니다." });
    }

    // 5. 승인된 수업인지 확인
    for (let i = 0; i < syllabus.teachers.length; i++) {
      if (!syllabus.teachers[i].confirmed) {
        return res.status(409).send({ message: "승인되지 않은 수업입니다." });
      }
    }

    // 6. 이미 신청한 수업인지 확인
    const exEnrollments = await _Enrollment.find({
      student: registration.user,
      season: registration.season,
    });
    if (_.find(exEnrollments, { syllabus: syllabus._id }))
      return res.status(409).send({ message: "이미 신청한 수업입니다." });

    // 7. 수강정원 확인
    if (syllabus.limit != 0) {
      const enrollmentsCnt = await _Enrollment.countDocuments({
        syllabus: syllabus._id,
      });
      if (enrollmentsCnt >= syllabus.limit)
        return res.status(409).send({ message: "수강정원이 다 찼습니다." });
    }

    // 8. 수강신청 가능한 시간인가?
    if (isTimeOverlapped(exEnrollments, syllabus))
      return res.status(409).send({
        message: `시간표가 중복되었습니다.`,
      });

    // 9. 수강신청 완료 (enrollment 생성)
    const enrollment = new _Enrollment({
      ...syllabus.getSubdocument(),
      student: registration.user,
      studentId: registration.userId,
      studentName: registration.userName,
      studentGrade: registration.grade,
    });

    // 10. evaluation 동기화
    enrollment.evaluation = {};
    for (let obj of season.formEvaluation) {
      if (obj.combineBy === "term") {
        const e2 = await _Enrollment.findOne({
          season: enrollment.season,
          student: enrollment.student,
          subject: enrollment.subject,
        });
        if (e2) {
          enrollment.evaluation[obj.label] = e2.evaluation[obj.label] || "";
        }
      } else if (obj.combineBy === "year") {
        const e2 = await _Enrollment.findOne({
          school: enrollment.school,
          year: enrollment.year,
          student: enrollment.student,
          subject: enrollment.subject,
        });
        if (e2) {
          enrollment.evaluation[obj.label] = e2.evaluation[obj.label] || "";
        }
      }
    }
    await enrollment.save();
    return res.status(200).send(enrollment);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
