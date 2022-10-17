const {
  Enrollment,
  Syllabus,
  Registration,
  Season,
} = require("../models/models");
const _ = require("lodash");

const isTimeOverlapped = async (user, syllabus) => {
  const enrollments = await Enrollment(user.dbName).find({
    studentId: user.userId,
    season: syllabus.season,
  });

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
    const _Enrollment = Enrollment(req.user.dbName);

    const syllabus = await Syllabus(req.user.dbName).findById(
      req.body.syllabus
    );
    if (!syllabus)
      return res.status(404).send({ message: "syllabus is not found" });

    for (let i = 0; i < syllabus.teachers.length; i++)
      if (!syllabus.teachers[i].confirmed)
        return res.status(404).send({ message: "syllabus is not confirmed" });

    // 1. 수강정원 확인
    const exEnrollments = await _Enrollment.find({
      syllabus: syllabus._id,
    });
    if (syllabus.limit != 0 && exEnrollments.length >= syllabus.limit)
      return res.status(409).send({ message: "수강정원이 다 찼습니다." });

    // 2. 수강신청 가능한 시간인가?
    if (await isTimeOverlapped(req.user, syllabus))
      return res.status(409).send({
        message: `시간표가 중복되었습니다.`,
      });

    // 3. 유저의 학기 등록 정보 확인
    const registration = await Registration(req.user.dbName).findOne({
      season: syllabus.season,
      userId: req.user.userId,
    });
    if (!registration) {
      return res.status(404).send({ message: "registration not found" });
    }

    // 유저 권한 확인
    const season = await Season(req.user.dbName).findById(syllabus.season);
    if (!season) return res.status(404).send({ message: "season not found" });
    if (
      !season.checkPermission("enrollment", req.user.userId, registration.role)
    )
      return res.status(409).send({ message: "you have no permission" });

    // 수강신청 완료 (도큐먼트 저장)
    const enrollment = new _Enrollment({
      ...syllabus.getSubdocument(),
      studentId: req.user.userId,
      studentName: req.user.userName,
    });
    await enrollment.save();
    return res.status(200).send(enrollment);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.enrollbulk = async (req, res) => {
  try {
    const syllabus = await Syllabus(req.user.dbName).findById(
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
      enrollments.push({
        ...syllabusSubdocument,
        studentId: student.userId,
        studentName: student.userName,
      });
    }
    const newEnrollments = await Enrollment(req.user.dbName).insertMany(
      enrollments
    );
    return res.status(200).send(newEnrollments);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    // find by enrollment _id (only student can view)
    if (req.params._id) {
      const enrollment = await Enrollment(req.user.dbName).findById(
        req.params._id
      );
      if (!enrollment)
        return res.status(404).send({ message: "enrollment not found" });

      if (enrollment.studentId != req.user.userId)
        return res.status(401).send();

      return res.status(200).send(enrollment);
    }

    const { season, studentId, syllabus } = req.query;

    // find by season & studentId
    if (season && studentId) {
      const enrollments = await Enrollment(req.user.dbName)
        .find({ season, studentId })
        .select("-evaluation");
      return res.status(200).send(enrollments);
    }

    // find by syllabus
    if (syllabus) {
      const enrollments = await Enrollment(req.user.dbName)
        .find({ syllabus })
        .select(["studentId", "studentName"]);
      return res.status(200).send(enrollments);
    }
    return res.status(400);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.findEvaluations = async (req, res) => {
  try {
    const { season, studentId, syllabus } = req.query;

    // find by season & studentId
    if (season && studentId) {
      if (req.user.userId != studentId) return res.status(401).send();
      const enrollments = await Enrollment(req.user.dbName).find({
        season,
        studentId,
      });
      return res.status(200).send(enrollments);
    }

    // find by syllabus
    if (syllabus) {
      const _syllabus = await Syllabus(req.user.dbName).findById(
        req.query.syllabus
      );
      if (!_syllabus)
        return res.status(404).send({ message: "syllabus not found" });

      // 권한 확인 - only teacher can accss evaluations
      for (let i = 0; i < _syllabus.teachers.length; i++) {
        if (_syllabus.teachers[i].userId == req.user.userId) {
          const enrollments = await Enrollment(req.user.dbName)
            .find({
              syllabus,
            })
            .select(["studentId", "studentName", "evaluation"]);
          return res.status(200).send(enrollments);
        }
      }
      return res.status(401).send();
    }

    return res.status(400).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateEvaluation = async (req, res) => {
  try {
    const enrollment = await Enrollment(req.user.dbName).findById(
      req.params._id
    );
    if (!enrollment)
      return res.status(404).send({ message: "enrollment not found" });

    // 유저 권한 확인
    const season = await Season(req.user.dbName).findById(enrollment.season);
    if (!season) return res.status(404).send({ message: "season not found" });

    const registration = await Registration(req.user.dbName).findOne({
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
    const enrollment = await Enrollment(req.user.dbName).findById(
      req.params._id
    );
    if (!enrollment)
      return res.status(404).send({ message: "enrollment not found" });

    if (req.user.auth == "admin" || req.user.auth == "manager") {
      await enrollment.remove();
      return res.status(200).send();
    }

    if (enrollment.studentId != req.user.userId) return res.status(401).send();

    // 유저 권한 확인
    const season = await Season(req.user.dbName).findById(enrollment.season);
    if (!season) return res.status(404).send({ message: "season not found" });

    const registration = await Registration(req.user.dbName).findOne({
      season: enrollment.season,
      userId: req.user.userId,
    });
    if (!registration)
      return res.status(404).send({ message: "registration not found" });

    if (
      !season.checkPermission("enrollment", req.user.userId, registration.role)
    )
      return res.status(401).send();

    await enrollment.remove();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
