const Enrollment = require("../models/Enrollment");
const Syllabus = require("../models/Syllabus");
const School = require("../models/School");
const SchoolUser = require("../models/SchoolUser");
const Registration = require("../models/Registration");
const Season = require("../models/Season");
const {
  findSeasonIdx,
  findRegistrationIdx,
  checkPermission,
  checkTimeAvailable,
} = require("../utils/util");
const { wrapWithErrorHandler } = require("../utils/errorHandler");
const _ = require("lodash");

const isTimeOverlapped = async (user, syllabus) => {
  const enrollments = await Enrollment(user.dbName).find(
    {
      studentId: user.userId,
      year: syllabus.year,
      term: syllabus.term,
    },
    "time"
  );
  console.log("your enrollments: ", enrollments);
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

const check = async (user, syllabus, type) => {
  const school = await School(user.dbName).findOne({
    schoolId: syllabus.schoolId,
  });
  if (!school) {
    const error = new Error("not existing school...");
    error.code = 404;
    throw error;
  }

  // 1. check if season is activated
  const seasonIdx = findSeasonIdx(school, syllabus.year, syllabus.term);
  if (seasonIdx == -1) {
    const error = new Error("not existing season...");
    error.code = 404;
    throw error;
  }
  if (!school["seasons"][seasonIdx]["activated"]) {
    const error = new Error("season is not activated...");
    error.code = 409;
    throw error;
  }

  // 2. check if user is registered in requrested season
  const schoolUser = await SchoolUser(user.dbName).findOne({
    userId: user.userId,
  });
  const registrationIdx = findRegistrationIdx(
    schoolUser,
    syllabus.year,
    syllabus.term
  );
  if (registrationIdx["year"] == -1) {
    const error = new Error("you are not registered in this year");
    error.code = 409;
    throw error;
  }
  if (registrationIdx["term"] == -1) {
    const error = new Error("you are not registered in this term");
    error.code = 409;
    throw error;
  }

  // 4. check if user's role has permission
  if (!checkPermission(school, seasonIdx, type, schoolUser)) {
    const error = new Error("you have no permission!");
    error.code = 401;
    throw error;
  }
};

module.exports.enroll = async (req, res) => {
  try {
    const _Enrollment = Enrollment(req.user.dbName);

    const syllabus = await Syllabus(req.user.dbName).findById(
      req.body.syllabus
    );
    if (!syllabus) {
      return res.status(404).send({ message: "syllabus is not found" });
    }
    for (let i = 0; i < syllabus.teachers.length; i++) {
      if (!syllabus.teachers[i].confirmed) {
        return res.status(404).send({ message: "syllabus is not confirmed" });
      }
    }

    // 1. 수강정원 확인
    const exEnrollments = await _Enrollment.find({
      syllabus: syllabus._id,
    });
    if (syllabus.limit != 0 && exEnrollments.length >= syllabus.limit) {
      return res.status(409).send({ message: "수강정원이 다 찼습니다." });
    }

    // 2. 수강신청 가능한 시간인가?
    if (await isTimeOverlapped(req.user, syllabus)) {
      return res.status(409).send({
        message: `시간표가 중복되었습니다.`,
      });
    }

    // 3. 유저의 학기 등록 정보 확인
    const registration = await Registration(req.user.dbName).findOne({
      schoolId: syllabus.schoolId,
      year: syllabus.year,
      term: syllabus.term,
      userId: req.user.userId,
    });
    if (!registration) {
      return res.status(404).send({ message: "registration not found" });
    }

    // 유저 권한 확인
    const season = await Season(req.user.dbName).findOne({
      schoolId: syllabus.schoolId,
      year: syllabus.year,
      term: syllabus.term,
    });
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }
    if (
      !season.checkPermission("enrollment", req.user.userId, registration.role)
    ) {
      return res.status(409).send({ message: "you have no permission" });
    }

    // 수강신청 완료 (도큐먼트 저장)
    const enrollment = new _Enrollment({
      syllabus: syllabus._id,
      ...syllabus.getSubdocument(),
      studentId: req.user.userId,
      studentName: req.user.userName,
    });
    await enrollment.save();
    return res.status(200).send(enrollment);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.enrollbulk = async (req, res) => {
  const syllabus = await Syllabus(req.user.dbName).findById(req.body.syllabus);
  if (!syllabus) {
    return res.status(404).send({ message: "syllabus is not found" });
  }
  for (let i = 0; i < syllabus.teachers.length; i++) {
    if (!syllabus.teachers[i].confirmed) {
      return res.status(404).send({ message: "syllabus is not confirmed" });
    }
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
  return res.status(200).send({ enrollments: newEnrollments });
};

module.exports.find = async (req, res) => {
  try {
    if (req.params._id) {
      const enrollment = await Enrollment(req.user.dbName).findById(
        req.params._id
      );
      if (!enrollment) {
        return res.status(404).send({ message: "enrollment not found" });
      }
      // 수강생 본인만 확인 가능
      // teachers에 등록된 선생님만 조회 가능
      if (enrollment.studentId == req.user.userId) {
        return res.status(200).send(enrollment);
      }
      return res.status(403).send({ message: "you have no permission" });
    }

    const { schoolId, year, term, studentId } = req.query;
    if (studentId == req.user.userId) {
      const enrollments = await Enrollment(req.user.dbName).find({
        schoolId,
        year,
        term,
        studentId: req.user.userId,
      });
      return res.status(200).send(enrollments);
    }
    const enrollments = await Enrollment(req.user.dbName)
      .find({ schoolId, year, term, studentId })
      .select("-evaluation");
    return res.status(200).send(enrollments);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.findStudents = async (req, res) => {
  try {
    const enrollments = await Enrollment(req.user.dbName)
      .find({
        syllabus: req.query.syllabus,
      })
      .select(["studentId", "studentName"]);
    return res.status(200).send(enrollments);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.findStudentsWithEvaluation = async (req, res) => {
  try {
    const syllabus = await Syllabus(req.user.dbName).findById(
      req.query.syllabus
    );
    if (!syllabus) {
      return res.status(404).send({ message: "syllabus not found" });
    }
    for (let i = 0; i < syllabus.teachers.length; i++) {
      if (syllabus.teachers[i].userId == req.user.userId) {
        const enrollments = await Enrollment(req.user.dbName)
          .find({
            syllabus: req.query.syllabus,
          })
          .select(["studentId", "studentName", "evaluation"]);
        return res.status(200).send(enrollments);
      }
    }
    return res.status(403).send({ message: "you have no permission" });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateEvaluation = async (req, res) => {
  try {
    const enrollment = await Enrollment(req.user.dbName).findById(
      req.params._id
    );
    if (!enrollment) {
      return res.status(404).send({ message: "enrollment not found" });
    }

    // 유저 권한 확인
    const registration = await Registration(req.user.dbName).findOne({
      schoolId: enrollment.schoolId,
      year: enrollment.year,
      term: enrollment.term,
      userId: req.user.userId,
    });
    const season = await Season(req.user.dbName).findOne({
      schoolId: enrollment.schoolId,
      year: enrollment.year,
      term: enrollment.term,
    });
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }
    if (
      !season.checkPermission("evaluation", req.user.userId, registration.role)
    ) {
      return res.status(409).send({ message: "you have no permission" });
    }

    for (let i = 0; i < enrollment.teachers.length; i++) {
      if (enrollment.teachers[i].userId == req.user.userId) {
        enrollment.evaluation = req.body.new;
        await enrollment.save();
        return res.status(200).send(enrollment);
      }
    }
    return res
      .status(401)
      .send({ err: "only teacher of syllabus can update evaluation!" });
  } catch (err) {
    return res.status(err.status || 500).send({ err: err.message });
  }
};

module.exports.remove = async (req, res) => {
  try {
    const enrollment = await Enrollment(req.user.dbName).findById(
      req.params._id
    );
    if (!enrollment) {
      return res.status(404).send({ message: "enrollment not found" });
    }

    if (enrollment.studentId != req.user.userId) {
      return res.status(403).send({ message: "you have no permission" });
    }
    // 3. 유저의 학기 등록 정보 확인
    const registration = await Registration(req.user.dbName).findOne({
      schoolId: enrollment.schoolId,
      year: enrollment.year,
      term: enrollment.term,
      userId: req.user.userId,
    });
    if (!registration) {
      return res.status(404).send({ message: "registration not found" });
    }

    // 유저 권한 확인
    const season = await Season(req.user.dbName).findOne({
      schoolId: enrollment.schoolId,
      year: enrollment.year,
      term: enrollment.term,
    });
    if (!season) {
      return res.status(404).send({ message: "season not found" });
    }
    if (
      !season.checkPermission("enrollment", req.user.userId, registration.role)
    ) {
      return res.status(403).send({ message: "you have no permission" });
    }

    await enrollment.remove();
    return res.status(200).send();
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};
