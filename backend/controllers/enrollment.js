const {
  Enrollment,
  Syllabus,
  Registration,
  Season,
} = require("../models/models");
const _ = require("lodash");

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

module.exports.enroll = async (req, res) => {
  try {
    const _Enrollment = Enrollment(req.user.academyId);
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.body.syllabus
    );
    if (!syllabus)
      return res.status(404).send({ message: "수업 정보를 찾을 수 없습니다." });

    const registration = await Registration(req.user.academyId).findById(
      req.body.registration
    );
    if (!registration) {
      return res.status(404).send({ message: "등록 정보를 찾을 수 없습니다." });
    }

    if (req.user.auth === "member" && req.user.userId !== registration.userId) {
      return res.status(401).send();
    }

    // 1. confirm 확인
    for (let i = 0; i < syllabus.teachers.length; i++)
      if (!syllabus.teachers[i].confirmed)
        return res.status(404).send({ message: "승인되지 않은 수업입니다." });

    // 2. 이미 신청한 수업인가?
    const exEnrollments = await _Enrollment.find({
      studentId: registration.userId,
      season: registration.season,
    });

    if (_.find(exEnrollments, { syllabus: syllabus._id })) {
      return res.status(409).send({ message: "이미 신청한 수업입니다." });
    }

    // 2. 수강정원 확인
    if (syllabus.limit != 0) {
      const enrollmentsCnt = await _Enrollment.countDocuments({
        syllabus: syllabus._id,
      });
      if (enrollmentsCnt >= syllabus.limit)
        return res.status(409).send({ message: "수강정원이 다 찼습니다." });
    }

    // 3. 수강신청 가능한 시간인가?
    if (isTimeOverlapped(exEnrollments, syllabus))
      return res.status(409).send({
        message: `시간표가 중복되었습니다.`,
      });

    // 유저 권한 확인
    const season = await Season(req.user.academyId).findById(syllabus.season);
    if (!season) return res.status(404).send({ message: "season not found" });
    if (
      !season.checkPermission(
        "enrollment",
        registration.userId,
        registration.role
      )
    )
      return res.status(401).send({ message: "you have no permission" });

    // 수강신청 완료 (도큐먼트 저장)
    const enrollment = new _Enrollment({
      ...syllabus.getSubdocument(),
      studentId: registration.userId,
      studentName: registration.userName,
    });
    await enrollment.save();
    return res.status(200).send(enrollment);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.enrollbulk = async (req, res) => {
  try {
    const _Enrollment = Enrollment(req.user.academyId);

    const syllabus = await Syllabus(req.user.academyId).findById(
      req.body.syllabus
    );
    if (!syllabus)
      return res.status(404).send({ message: "syllabus is not found" });

    for (let i = 0; i < syllabus.teachers.length; i++) {
      if (!syllabus.teachers[i].confirmed)
        return res.status(409).send({ message: "syllabus is not confirmed" });
    }

    const enrollments = [];
    const syllabusSubdocument = syllabus.getSubdocument();

    for (let student of req.body.students) {
      const enrollment = new _Enrollment({
        ...syllabusSubdocument,
        studentId: student.userId,
        studentName: student.userName,
      });
      await enrollment.save();
      enrollments.push(enrollment);
    }
    // const newEnrollments = await Enrollment(req.user.academyId).insertMany(
    //   enrollments
    // );
    return res.status(200).send({ enrollments });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
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

    const { season, year, studentId, syllabus, syllabuses } = req.query;

    // find by season & studentId
    if (season && studentId) {
      const enrollments = await Enrollment(req.user.academyId).find({
        season,
        studentId,
      });
      //  .select("-evaluation"); 임시적으로 권한 허용
      return res.status(200).send({ enrollments });
    }

    if (year && studentId) {
      const enrollments = await Enrollment(req.user.academyId).find({
        year,
        studentId,
      });
      //   .select("-evaluation"); // 임시적으로 권한 허용
      return res.status(200).send({ enrollments });
    }

    if (studentId) {
      const enrollments = await Enrollment(req.user.academyId).find({
        studentId,
      });
      //  .select("-evaluation"); 임시적으로 권한 허용
      return res.status(200).send({ enrollments });
    }

    // find by syllabus
    if (syllabus) {
      const enrollments = await Enrollment(req.user.academyId)
        .find({ syllabus })
        .select(["studentId", "studentName"]);
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
    return res.status(500).send({ message: err.message });
  }
};

module.exports.findEvaluations = async (req, res) => {
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
        enrollments: enrollments.map((eval) => {
          return {
            studentId: eval.studentId,
            studentName: eval.studentName,
            evaluation: eval.evaluation,
            createdAt: eval.createdAt,
            updatedAt: eval.updatedAt,
          };
        }),
      });
    }

    const enrollments = await Enrollment(req.user.academyId)
      .find(req.query)
      .select("-info");
    return res.status(200).send({ enrollments });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateEvaluation = async (req, res) => {
  try {
    const enrollment = await Enrollment(req.user.academyId).findById(
      req.params._id
    );
    if (!enrollment)
      return res.status(404).send({ message: "enrollment not found" });

    // 유저 권한 확인
    const season = await Season(req.user.academyId).findById(enrollment.season);
    if (!season) return res.status(404).send({ message: "season not found" });

    const registration = await Registration(req.user.academyId).findOne({
      season: enrollment.season,
      userId: req.user.userId,
    });
    if (!registration)
      return res.status(404).send({ message: "registration not found" });

    if (
      !season.checkPermission("evaluation", req.user.userId, registration.role)
    )
      return res.status(409).send({ message: "you have no permission" });

    for (let i = 0; i < enrollment.teachers.length; i++) {
      if (enrollment.teachers[i].userId == req.user.userId) {
        enrollment.evaluation = req.body.new;
        await enrollment.save();
        return res.status(200).send(enrollment);
      }
    }
    return res.status(401).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.remove = async (req, res) => {
  try {
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
      userId: enrollment.userId,
    });
    if (!registration) {
      return res.status(404).send({ message: "등록 정보를 찾을 수 없습니다." });
    }

    const season = await Season(req.user.academyId).findById(enrollment.season);
    if (!season) return res.status(404).send({ message: "season not found" });
    if (
      !season.checkPermission(
        "enrollment",
        registration.userId,
        registration.role
      )
    )
      return res.status(401).send({ message: "you have no permission" });

    await enrollment.remove();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
