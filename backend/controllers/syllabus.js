const User = require('../models/User')
const Syllabus = require("../models/Syllabus");
const Enrollment = require('../models/Enrollment');
const School = require('../models/School');
const SchoolUser = require('../models/SchoolUser');
const { findSeasonIdx, findRegistrationIdx, checkPermission } = require('../utils/util');
const { classroomsTable, checkClassroomAvailable,isEqual} = require('../utils/util');

const check = async (user, syllabus) => {

    // 1. find school
    const school = await School(user.dbName).findOne({ schoolId: syllabus.schoolId });
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
    const schoolUser = await SchoolUser(user.dbName).findOne({ userId: user.userId });
    const registrationIdx = findRegistrationIdx(schoolUser, syllabus.year, syllabus.term);
    if (registrationIdx['year'] == -1) {
        const error = new Error("you are not registered in this year");
        error.code = 409;
        throw error;
    }
    if (registrationIdx['term'] == -1) {
        const error = new Error("you are not registered in this term");
        error.code = 409;
        throw error;
    }

    // 4. check if user's role has permission
    if (!checkPermission(school, seasonIdx, 'syllabus', schoolUser)) {
        const error = new Error("you have no permission!");
        error.code = 401;
        throw error;
    }
}

exports.create = async (req, res) => {
    try {
        const year = req.body.year;
        const term = req.body.term;
        const schoolId = req.body.schoolId;

        const _Syllabus = Syllabus(req.user.dbName);
        const syllabus = new _Syllabus(req.body);


        await check(req.user, syllabus);

        // check if classroom is available
        const syllabuses = await Syllabus(req.user.dbName).find({ schoolId, year, term, classroom: req.body.classroom });
        await checkClassroomAvailable(syllabuses, syllabus);

        syllabus.userId = req.user.userId;
        syllabus.userName = req.user.userName;
        await syllabus.save();
        return res.status(200).send({ syllabus })
    }
    catch (err) {
        return res.status(err.code || 500).send({ err: err.message });
    }
}

exports.list = async (req, res) => {
    try {
        const query = {
            schoolId: req.query.schoolId,
            year: req.query.year,
            term: req.query.term
        };
        if (req.query.userId) {
            query['userId'] = req.query.userId;
        }
        if (req.query.teacherId) {
            query['teachers.userId'] = req.query.teacherId;
        }

        const syllabuses = await Syllabus(req.user.dbName).find(query);
        return res.status(200).send({ syllabuses })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.read = async (req, res) => {
    try {
        const syllabus = await Syllabus(req.user.dbName).findOne({ _id: req.params._id });
        return res.status(200).send({ syllabus })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.students = async (req, res) => {
    try {
        const syllabus = await Syllabus(req.user.dbName).findOne({ _id: req.params._id });
        if (!syllabus) {
            return res.status(404).send({ message: "no syllabus!" });
        }
        const students = await Enrollment(req.user.dbName).find({ "syllabus._id": syllabus._id });
        return res.status(200).send({
            students: students.map((student) => {
                return {
                    userId: student.userId,
                    userName: student.userName
                }
            })
        });
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.classrooms = async (req, res) => {
    try {
        const schoolId = req.query.schoolId;
        const year = req.query.year;
        const term = req.query.term;

        const syllabuses = await Syllabus(req.user.dbName).find({ schoolId, year, term });

        const table = await classroomsTable(syllabuses);
        res.status(200).json({ table })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.time = async (req, res) => {
    try {
        const syllabus = await Syllabus(req.user.dbName).findOne({ _id: req.params._id });
        if (!syllabus) {
            return res.status(404).send({ message: "no syllabus!" });
        }
        const students = await Enrollment(req.user.dbName).find({ "syllabus._id": syllabus._id });
        return res.status(200).send({
            students: students.map((student) => {
                return {
                    userId: student.userId,
                    userName: student.userName
                }
            })
        });
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.confirm = async (req, res) => {
    try {
        // authentication
        const syllabus = await Syllabus(req.user.dbName).findOne({ _id: req.params._id });

        if (!syllabus.teachers.some(teacher => (teacher.userId === req.user.userId))) {
            return res.status(403).send({ message: "you cannot confirm this syllabus" })
        }
        syllabus['confirmed'] = req.body.data;
        await syllabus.save();
        return res.status(200).send({ syllabus })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.update = async (req, res) => {
    try {
        // 내가 만든 syllabus인가?
        const syllabus = await Syllabus(req.user.dbName).findOne({ _id: req.params._id });
        if (req.user.userId != syllabus.userId) {
            return res.status(403).send({ message: "you cannot update this syllabus" })
        };

        await check(req.user, syllabus);

        // 어떤게 수정 가능한 필드지?
        const fields = ['classTitle', 'time', 'point', 'classroom', 'subject', 'teachers', 'info'];

        // confirmed 상태에서 time과 teachers를 수정할 수 없다.
        if (syllabus.confirmed) {
            if ((req.params.field === 'time' && syllabus.isTimeEqual(req.body.new))
                || (!req.params.field && !isEqual(syllabus.time, req.body.new['time']))) {
                return res.status(409).send({ message: "time can't be updated after it is confirmed" });
            }
            if ((req.params.field === 'teachers' && syllabus.isTeachersEqual(req.body.new))
                || (!req.params.field && !isEqual(syllabus.teachers, req.body.new['teachers']))) {
                return res.status(409).send({ message: "teachers can't be updated after it is confirmed" });
            }
        }

        // field를 설정해서 수정하는 경우
        if (req.params.field) {
            if (fields.includes(req.params.field)) {
                syllabus[req.params.field] = req.body.new;
            }
            else {
                return res.status(400).send({ message: `field '${req.params.field}' does not exist or cannot be updated` });
            }
        }
        // 전체로 수정하는 경우
        else {
            fields.forEach(field => {
                syllabus[field] = req.body.new[field];
            });
        }

        await syllabus.save();

        // update enrollments cascade
        const subdocument= syllabus.getSubdocument();
        const enrollments = await Enrollment(req.user.dbName).find({ 'syllabus._id': syllabus._id });
        await Promise.all(
            enrollments.map((enrollment) => {
                enrollment['syllabus'] =subdocument;
                enrollment.save();
            }),
        )
        return res.status(200).send({ syllabus, enrollments })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await Syllabus(req.user.dbName).findByIdAndDelete(req.params._id);
        return res.status(200).send({ success: (!!doc) })
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


