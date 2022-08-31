const Enrollment = require("../models/Enrollment");
const Syllabus = require("../models/Syllabus");
const School = require("../models/School");
const SchoolUser = require("../models/SchoolUser");
const {
    findSeasonIdx,
    findRegistrationIdx,
    checkPermission,
    checkTimeAvailable
} = require("../utils/util");

const check = async (user, syllabus, type) => {
    // 1. find school
    const school = await School(user.dbName).findOne({
        schoolId: syllabus.schoolId
    });
    if (!school) {
        const error = new Error("not existing school...");
        error.code = 404;
        throw error;
    }

    // 2. check if season is activated
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

    // 3. check if user is registered in requrested season
    const schoolUser = await SchoolUser(user.dbName).findOne({
        userId: user.userId
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

exports.create = async (req, res) => {
    try {
        const _Enrollment = Enrollment(req.user.dbName);
        const _enrollment = await _Enrollment.findOne({
            userId: req.user.userId,
            "syllabus._id": req.body.syllabus
        });
        if (_enrollment) {
            return res
                .status(409)
                .send({ message: "you already enrolled in this syllabus" });
        }

        const syllabus = await Syllabus(req.user.dbName).findById(
            req.body.syllabus
        );
        if (!syllabus) {
            return res.status(404).send({ message: "invalid syllabus!" });
        }
        if (!syllabus["confirmed"]) {
            return res
                .status(409)
                .send({
                    message: "This course is not enrollable at the moment"
                });
        }

        await check(req.user, syllabus, "enrollment");
        const enrollments = await Enrollment(req.user.dbName).find({
            userId: req.user.userId
        });
        await checkTimeAvailable(enrollments, syllabus.time);

        const enrollment = new _Enrollment({
            userId: req.user.userId,
            userName: req.user.userName,
            syllabus: syllabus.getSubdocument()
        });
        await enrollment.save();
        return res.status(200).send({ enrollment });
    } catch (err) {
        if (err) return res.status(err.code || 500).send({ err: err.message });
    }
};

exports.createBulk = async (req, res) => {
    try {
        const _syllabus = await Syllabus(req.user.dbName).findById(
            req.body.syllabus
        );
        if (!_syllabus) {
            return res.status(404).send({ message: "invalid syllabus!" });
        }
        if (_syllabus["confirmed"]) {
            return res
                .status(409)
                .send({
                    message: "This course is not enrollable at the moment"
                });
        }

        const userIds = (
            await Enrollment(req.user.dbName).find({
                "syllabus._id": _syllabus._id
            })
        ).map((enrollment) => enrollment.userId); //해당 수업을 듣는 학생들의 userId 리스트

        const subSyllabus = _syllabus.getSubdocument();
        const enrollments = [];
        for (let student of req.body.students) {
            if (userIds.includes(student.userId)) {
                return res
                    .status(409)
                    .send({
                        message: `${student.userName}(${student.userId}) is already enrolled in this syllabus!`
                    });
            }
            enrollments.push({
                userId: student.userId,
                userName: student.userName,
                syllabus: subSyllabus
            });
        }
        const newEnrollments = await Enrollment(req.user.dbName).insertMany(
            enrollments
        );
        return res.status(200).send({ enrollment: newEnrollments });
    } catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
};

exports.list = async (req, res) => {
    try {
        const enrollments = await Enrollment(req.user.dbName).find({
            userId: req.query.userId,
            "syllabus.year": req.query.year,
            "syllabus.term": req.query.term,
            "syllabus.schoolId": req.query.schoolId
        });
        return res.status(200).send({
            enrollments: enrollments.map((enrollment) => {
                console.log(enrollment["syllabus"]["classTitle"]);
                return {
                    _id: enrollment["_id"],
                    classTitle: enrollment["syllabus"]["classTitle"],
                    time: enrollment["syllabus"]["time"],
                    point: enrollment["syllabus"]["point"],
                    subject: enrollment["syllabus"]["subject"]
                };
            })
        });
    } catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
};

exports.updateEvaluation = async (req, res) => {
    try {
        // 권한 먼저 확인해야 함
        const enrollment = await Enrollment(req.user.dbName).findOne({
            _id: req.params._id
        });
        if (!enrollment) {
            return res.status(404).send({ message: "no enrollment!" });
        }
        const syllabus = await Syllabus(req.user.dbName).findById(
            enrollment.syllabus._id
        );
        if (
            !syllabus.teachers.some(
                (teacher) => teacher.userId === req.user.userId
            )
        ) {
            const error = new Error("you have no permission!");
            error.code = 401;
            throw error;
        }

        await check(req.user, enrollment.syllabus, "evaluation");

        enrollment["evaluation"] = req.body.new;
        await enrollment.save();

        return res.status(200).send({ enrollment });
    } catch (err) {
        if (err) return res.status(err.code || 500).send({ err: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const doc = await Enrollment(req.user.dbName).findByIdAndDelete(
            req.params._id
        );
        return res.status(200).send({ success: !!doc });
    } catch (err) {
        return res.status(500).send({ err: err.message });
    }
};
