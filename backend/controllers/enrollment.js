const Enrollment = require("../models/Enrollment");
const Syllabus = require("../models/Syllabus");
const School = require("../models/School");
const SchoolUser = require("../models/SchoolUser");
const {
  findSeasonIdx,
  findRegistrationIdx,
  checkPermission,
  checkTimeAvailable,
} = require("../utils/util");
const { wrapWithErrorHandler } = require("../utils/errorHandler");
const _ = require("lodash");

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

const create = async (req, res) => {
  const user = req.user;
  const _Enrollment = Enrollment(user.dbName);
  const _Syllabus = Syllabus(user.dbName);
  const _School = School(user.dbName);
  const _SchoolUser = SchoolUser(user.dbName);

  const syllabus = await _Syllabus.findOne({
    _id: req.body.syllabus,
    confirmed: true,
  });
  if (!syllabus) {
    return res
      .status(409)
      .send({ message: "syllabus is not confirmed or doens't exist" });
  }

  // 1. 수강정원 확인
  const exEnrollments = await _Enrollment.find({
    "syllabus._id": req.body.syllabus,
  });
  if (syllabus.limit != 0 && exEnrollments.length >= syllabus.limit) {
    return res.status(409).send({ message: "수강정원이 다 찼습니다." });
  }

  // 2. 수강신청 가능한 시간인가?
  const myEnrollments = await _Enrollment.find({
    userId: user.userId,
    "syllabus.year": syllabus.year,
    "syllabus.term": syllabus.term,
  });
  await checkTimeAvailable(myEnrollments, syllabus.time);

  // 4. register 여부 확인
  const schoolUser = await _SchoolUser.findOne({
    schoolId: syllabus.schoolId,
    userId: user.userId,
  });
  if (!schoolUser) {
    return res.status(404).send({
      message: "schoolUser not found",
    });
  }
  let isRegistered = schoolUser.registrations.some(function (registration) {
    return (
      registration.year == syllabus.year &&
      registration.terms.includes(syllabus.term)
    );
  });
  if (!isRegistered) {
    console.log(schoolUser);
    return res.status(404).send({
      message: "schoolUser not found(check registration)",
    });
  }

  // 3. season 활성화 확인
  const school = _School.findOne({
    schoolId: syllabus.schoolId,
  });
  if (!school) {
    return res.status(404).send({
      message: "school not found",
    });
  }

  // 5. permission 확인
  const seasonIdx = _.findIndex(school.seasons, {
    year: syllabus.year,
    term: syllabus.term,
    activated: true,
  });
  if (seasonIdx == -1) {
    return res.status(404).send({
      message: "season not found",
    });
  }
  if (!checkPermission(school, seasonIdx, "enrollment", schoolUser)) {
    return res.status(401).send({
      message: "you have no permission",
    });
  }

  // 수강신청 완료 (도큐먼트 저장)
  const enrollment = new _Enrollment({
    userId: user.userId,
    userName: user.userName,
    syllabus: syllabus.getSubdocument(),
  });
  await enrollment.save();
  return res.status(200).send({ enrollment });
};

const createBulk = async (req, res) => {
  const _syllabus = await Syllabus(req.user.dbName).findById(req.body.syllabus);
  if (!_syllabus) {
    return res.status(404).send({ message: "invalid syllabus!" });
  }
  if (_syllabus["confirmed"]) {
    return res.status(409).send({
      message: "This course is not enrollable at the moment",
    });
  }

  const userIds = (
    await Enrollment(req.user.dbName).find({
      "syllabus._id": _syllabus._id,
    })
  ).map((enrollment) => enrollment.userId); //해당 수업을 듣는 학생들의 userId 리스트

  const subSyllabus = _syllabus.getSubdocument();
  const enrollments = [];
  for (let student of req.body.students) {
    if (userIds.includes(student.userId)) {
      return res.status(409).send({
        message: `${student.userName}(${student.userId}) is already enrolled in this syllabus!`,
      });
    }
    enrollments.push({
      userId: student.userId,
      userName: student.userName,
      syllabus: subSyllabus,
    });
  }
  const newEnrollments = await Enrollment(req.user.dbName).insertMany(
    enrollments
  );
  return res.status(200).send({ enrollment: newEnrollments });
};

const getAll = async (req, res) => {
  queries = _.pickBy(
    {
      userId: req.query.userId,
      "syllabus.year": req.query.year,
      "syllabus.term": req.query.term,
      "syllabus.schoolId": req.query.schoolId,
    },
    (v) => v !== undefined
  );

  const enrollments = await Enrollment(req.user.dbName).find(queries);
  return res.status(200).send({
    enrollments: enrollments.map((enrollment) => {
      console.log(enrollment["syllabus"]["classTitle"]);
      return {
        _id: enrollment["_id"],
        classTitle: enrollment["syllabus"]["classTitle"],
        time: enrollment["syllabus"]["time"],
        point: enrollment["syllabus"]["point"],
        subject: enrollment["syllabus"]["subject"],
      };
    }),
  });
};

const updateEvaluation = async (req, res) => {
  // 권한 먼저 확인해야 함
  const enrollment = await Enrollment(req.user.dbName).findOne({
    _id: req.params._id,
  });
  if (!enrollment) {
    return res.status(404).send({ message: "no enrollment!" });
  }
  const syllabus = await Syllabus(req.user.dbName).findById(
    enrollment.syllabus._id
  );
  if (
    !syllabus.teachers.some((teacher) => teacher.userId === req.user.userId)
  ) {
    return res.status(401).send({ err: "you have no permission!" });
  }

  await check(req.user, enrollment.syllabus, "evaluation");

  enrollment["evaluation"] = req.body.new;
  await enrollment.save();

  return res.status(200).send({ enrollment });
};

const remove = async (req, res) => {
  const doc = await Enrollment(req.user.dbName).findByIdAndDelete(
    req.params._id
  );
  return res.status(200).send({ success: !!doc });
};

module.exports = wrapWithErrorHandler({
  create,
  createBulk,
  getAll,
  updateEvaluation,
  remove,
});
