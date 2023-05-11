const { logger } = require("../log/logger");
const { Season, Registration, Syllabus, Enrollment } = require("../models");
const _ = require("lodash");

const checkPermission = async (user, syllabus) => {
  const season = await Season(user.academyId).findById(syllabus.season);
  if (!season) {
    const err = new Error("season not found");
    err.status = 404;
    throw err;
  }

  const registration = await Registration(user.academyId)
    .findOne({ user: user._id, season: season._id })
    .lean();
  if (!registration) {
    const err = new Error("registration not found");
    err.status = 404;
    throw err;
  }

  if (!season.checkPermission("syllabus", user.userId, registration.role)) {
    const err = new Error("you have no permission");
    err.status = 403;
    throw err;
  }

  return true;
};

const isFullyConfirmed = (syllabus) =>
  _.filter(syllabus.teachers, { confirmed: true }).length ===
  syllabus.teachers.length;

const getUnavailableTimeLabels = async (academyId, syllabus) => {
  const { schoolId, season, classroom, time } = syllabus;
  if (!classroom) return [];
  const syllabuses = await Syllabus(academyId).find(
    {
      schoolId,
      season,
      classroom,
      _id: { $ne: syllabus._id },
    },
    "time"
  );
  const unavailableTime = _.flatten(
    syllabuses.map((syllabus) => syllabus.time)
  );
  const unavailableTimeLabels = _([...unavailableTime, ...time])
    .groupBy((x) => x.label)
    .pickBy((x) => x.length > 1)
    .keys()
    .value();
  return unavailableTimeLabels;
};

module.exports.create = async (req, res) => {
  try {
    // 유저의 학기 등록 정보 확인
    const registration = await Registration(req.user.academyId).findById(
      req.body.registration
    );
    if (!registration)
      return res.status(404).send({ message: "registration not found" });

    // 유저 권한 확인
    const season = await Season(req.user.academyId).findById(req.body.season);
    if (!season) return res.status(404).send({ message: "season not found" });

    if (
      !season.checkPermission(
        "syllabus",
        registration.userId,
        registration.role
      )
    )
      return res.status(409).send({ message: "you have no permission" });

    const syllabus = new (Syllabus(req.user.academyId))({
      ...season.getSubdocument(),
      user: req.user._id,
      userId: req.user.userId,
      userName: req.user.userName,
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

    // classroom 시간 확인
    const unavailableTimeLabels = await getUnavailableTimeLabels(
      req.user.academyId,
      syllabus
    );
    if (!_.isEmpty(unavailableTimeLabels))
      return res.status(409).send({
        message: `classroom(${syllabus.classroom}) is not available on ${unavailableTimeLabels}`,
      });

    await syllabus.save();
    return res.status(200).send(syllabus);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    if (req.params._id) {
      const syllabus = await Syllabus(req.user.academyId).findById(
        req.params._id
      );
      return res.status(200).send(syllabus);
    }

    const queries = req.query;
    if (queries.teacher) {
      queries["teachers._id"] = queries.teacher;
      delete queries.teacherId;
    }
    if (queries.teacherId) {
      queries["teachers.userId"] = queries.teacherId;
      delete queries.teacherId;
    }
    if (queries.confirmed) {
      queries["teachers.confirmed"] = { $ne: false };
      delete queries.confirmed;
    }
    if (queries.matches) {
      queries[queries.field] = { $regex: queries.matches };
      delete queries.matches;
      delete queries.field;
    }
    if (queries.season && queries.student) {
      const studentEnrollements = await Enrollment(req.user.academyId)
        .find({
          season: queries.season,
          student: queries.student,
        })
        .select("syllabus");

      queries["_id"] = { $in: studentEnrollements.map((e) => e.syllabus) };
      delete queries.studentId;
    }

    let syllabuses = [];
    let enrollments = [];

    if (queries.classrom) {
      syllabuses = await Syllabus(req.user.academyId)
        .find(queries)
        .select(["classTitle", "time"]);
    } else {
      syllabuses = await Syllabus(req.user.academyId)
        .find(queries)
        .select("-info");
      enrollments = await Enrollment(req.user.academyId)
        .find({ syllabus: { $in: syllabuses.map((s) => s._id) } })
        .select("syllabus");
    }

    return res.status(200).send({ syllabuses, enrollments });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

module.exports.confirm = async (req, res) => {
  try {
    // authentication
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.params._id
    );
    for (let i = 0; i < syllabus.teachers.length; i++) {
      if (syllabus.teachers[i]._id.equals(req.user._id)) {
        syllabus.teachers[i].confirmed = true;
        await syllabus.save();
        return res.status(200).send(syllabus);
      }
    }
    return res
      .status(403)
      .send({ message: "you cannot confirm this syllabus" });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

module.exports.unconfirm = async (req, res) => {
  try {
    // authentication
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.params._id
    );

    for (let i = 0; i < syllabus.teachers.length; i++) {
      if (syllabus.teachers[i]._id.equals(req.user._id)) {
        const enrollments = await Enrollment(req.user.academyId).find({
          syllabus: syllabus._id,
        });
        if (!_.isEmpty(enrollments)) {
          return res.status(409).send({
            message: "수강신청한 학생이 있으면 승인을 취소할 수 없습니다.",
          });
        }
        syllabus.teachers[i].confirmed = false;
        await syllabus.save();
        return res.status(200).send(syllabus);
      }
    }
    return res
      .status(403)
      .send({ message: "you cannot unconfirm this syllabus" });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

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

const fields2 = ["classTitle", "point", "teachers", "info", "limit"];

module.exports.updateV2 = async (req, res) => {
  try {
    for (let field of fields) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: `field is missing: ${field}` });
      }
    }

    const user = req.user;

    const syllabus = await Syllabus(user.academyId).findById(req.params._id);
    if (!syllabus) {
      return res.status(404).send({ message: "syllabus not found" });
    }

    // 권한 확인
    try {
      await checkPermission(user, syllabus);
    } catch (err) {
      throw err;
    }

    // 별도 확인이 필요한 수정 사항
    const isUpdated = {
      time: !(
        syllabus.time.length === req.body.time.length &&
        syllabus.time.every(
          (timeBlock, idx) => timeBlock.label === req.body.time[idx].label
        )
      ),
      classroom: syllabus.classroom !== req.body.classroom,
      subject: !_.isEqual(syllabus.subject, req.body.subject),
    };

    // user가 syllabus 작성자이고 멘토가 아닌 경우
    if (
      user._id.equals(syllabus.user) &&
      !_.find(syllabus.teachers, { _id: user._id })
    ) {
      // 승인된 상태에서는 수정할 수 없다.
      if (isFullyConfirmed()) {
        return res.status(409).send({
          message: "you cannot update this syllabus becuase it is confirmed",
        });
      }
      // enrollment가 있는 경우 수정할 수 없다.
      if (
        await Enrollment(user.academyId).findOne({ syllabus: syllabus._id })
      ) {
        return res.status(409).send({
          message: "you cannot update this syllabus becuase it is enrolled",
        });
      }

      // 수정
      fields.forEach((field) => {
        syllabus[field] = req.body[field];
      });

      // 시간 중복 확인
      if (isUpdated[time] || isUpdated[classroom]) {
        const unavailableTimeLabels = await getUnavailableTimeLabels(
          user.academyId,
          syllabus
        );

        if (!_.isEmpty(unavailableTimeLabels)) {
          return res.status(409).send({
            message: `classroom(${syllabus.classroom}) is not available on ${unavailableTimeLabels}`,
          });
        }
      }

      await syllabus.save();
      return res.status(200).send({});
    }

    // user가 syllabus 멘토인 경우
    if (_.find(syllabus.teachers, { _id: user._id })) {
      const enrollments = await Enrollment(user.academyId).find({
        syllabus: syllabus._id,
      });

      // enrollment가 없는 경우
      if (enrollments.length === 0) {
        // 수정
        fields.forEach((field) => {
          syllabus[field] = req.body[field];
        });

        // 시간 중복 확인
        if (isUpdated["time"] || isUpdated["classroom"]) {
          const unavailableTimeLabels = await getUnavailableTimeLabels(
            user.academyId,
            syllabus
          );

          if (!_.isEmpty(unavailableTimeLabels)) {
            return res.status(409).send({
              message: `classroom(${syllabus.classroom}) is not available on ${unavailableTimeLabels}`,
            });
          }
        }

        await syllabus.save();
        return res.status(200).send({});
      }

      // enrollment가 있는 경우
      if (req.body.limit !== 0 && req.body.limit < enrollments.length) {
        return res
          .status(409)
          .send({ message: "수강생 수가 수강정원을 초과합니다." });
      }
      if (isUpdated["time"] || isUpdated["classroom"]) {
        return res.status(409).send({
          message:
            "수강생이 있는 상태에서 시간 또는 강의실을 변경할 수 없습니다.",
          isUpdated,
          time1: syllabus.time.length === req.body.time.length,
          time2: syllabus.time.every((timeBlock, idx) => {
            if (!_.isEqual(timeBlock, req.body.time[idx])) {
              console.log(timeBlock, req.body.time[idx]);
            }
            return _.isEqual(timeBlock, req.body.time[idx]);
          }),
        });
      }
      if (isUpdated["subject"]) {
        return res.status(409).send({
          message:
            "수강생이 있는 상태에서 교과목을 변경할 수 없습니다. 별도 교과목 수정 API를 사용해주세요.",
        });
      }
      // 수정
      fields2.forEach((field) => {
        syllabus[field] = req.body[field];
      });

      await Promise.all(
        enrollments.map((e) => {
          fields2.forEach((field) => {
            e[field] = syllabus[field];
          });
          return e.save();
        })
      );

      await syllabus.save();
      return res.status(200).send({});
    }

    return res.status(403).send({
      message: "you cannot update this syllabus",
    });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

module.exports.update = async (req, res) => {
  try {
    // 내가 만둘었거나 멘토링하는 syllabus인가?
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.params._id
    );
    if (!syllabus) {
      return res.status(404).send({ message: "syllabus not found" });
    }

    if (
      req.user.userId != syllabus.userId &&
      !_.find(syllabus.teachers, { _id: req.user._id })
    ) {
      return res.status(403).send({
        message: "you cannot update this syllabus",
        teachers: syllabus.teachers,
        "req.user": req.user,
      });
    }

    // 모두 confirmed된 상태에서는 수정할 수 없다.
    const fullyConfirmed =
      _.filter(syllabus.teachers, { confirmed: true }).length ===
      syllabus.teachers.length;
    if (fullyConfirmed)
      return res.status(409).send({
        message: "you cannot update this syllabus becuase it is confirmed",
      });

    // 전체로 수정하는 경우
    if (!req.params.field) {
      [
        "classTitle",
        "time",
        "point",
        "classroom",
        "subject",
        "teachers",
        "info",
        "limit",
      ].forEach((field) => {
        syllabus[field] = req.body.new[field];
      });

      // classroom 중복 확인
      const unavailableTimeLabels = await getUnavailableTimeLabels(
        req.user.academyId,
        syllabus
      );

      if (!_.isEmpty(unavailableTimeLabels)) {
        return res.status(409).send({
          message: `classroom(${syllabus.classroom}) is not available on ${unavailableTimeLabels}`,
        });
      }
    }

    // field를 설정해서 수정하는 경우
    else if (
      _.indexOf(
        ["classTitle", "point", "subject", "teachers", "info", "limit"],
        req.params.field
      ) != -1
    ) {
      syllabus[req.params.field] = req.body.new;
    } else {
      return res.status(409).send({ message: "you cannot update this field" });
    }
    await syllabus.save();
    return res.status(200).send(syllabus);
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

module.exports.remove = async (req, res) => {
  try {
    const syllabus = await Syllabus(req.user.academyId).findById(
      req.params._id
    );
    if (!syllabus) return res.status(404).send();
    await syllabus.delete();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send();
  }
};
