const User = require('../models/User')
const Syllabus = require("../models/Syllabus");
const Enrollment = require('../models/Enrollment');
const School = require('../models/School');
const SchoolUser = require('../models/SchoolUser');
const { findSeasonIdx, findRegistrationIdx, checkPermission } = require('../utils/util');
const { classroomsTable, checkClassroomAvailable } = require('../utils/util');

exports.create = async (req, res) => {
    try {
        const year = req.body.year;
        const term = req.body.term;
        const schoolId = req.body.schoolId;

        // 1. find school
        const school = await School(req.user.dbName).findOne({ schoolId: req.body.schoolId });
        if (!school) {
            return res.status(404).send({ message: "not existing school..." });
        }

        // 2. check if season is activated
        const seasonIdx = findSeasonIdx(school, year, term);
        if (seasonIdx == -1) {
            return res.status(404).send({ message: "not existing season..." });
        }
        if (!school["seasons"][seasonIdx]["activated"]) {
            return res.status(409).send({ message: "season is not activated..." });
        }

        // 3. check if user is registered in requrested season
        const schoolUser = await SchoolUser(req.user.dbName).findOne({ userId: req.user.userId });
        const registrationIdx = findRegistrationIdx(schoolUser, year, term);
        if (registrationIdx['year'] == -1) {
            return res.status(409).send({ message: "you are not registered in this year" });
        }
        if (registrationIdx['term'] == -1) {
            return res.status(409).send({ message: "you are not registered in this term" });
        }

        // 4. check if user's role has permission
        if (!checkPermission(school, seasonIdx, 'syllabus', schoolUser)) {
            return res.status(401).send({ message: 'you have no permission!' });
        }

        // 5. check if classroom is available
        const syllabuses = await Syllabus(req.user.dbName).find({ schoolId, year, term, classroom: req.body.classroom });
        await checkClassroomAvailable(syllabuses,req.body.time,req.body.classroom);
     
        const _Syllabus = Syllabus(req.user.dbName);
        const syllabus = new _Syllabus(req.body);
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

        if(!syllabus.teachers.some(teacher=>(teacher.userId===req.user.userId)))
         {
            return res.status(403).send({ message: "you cannot confirm this syllabus" })
        }
        syllabus['confirmed']=req.body.data;
        await syllabus.save();
        return res.status(200).send({ syllabus })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.update = async (req, res) => {
    try {
        // authentication
        const syllabus = await Syllabus(req.user.dbName).findOne({ _id: req.params._id });
        if (req.user.userId != syllabus.userId) {
            return res.status(403).send({ message: "you cannot update this syllabus" })
        };

        // 수정이 가능한 시즌인지도 확인해야 함. 
        // 어떤게 수정 가능한 필드지?
        const fields = ['classTitle', 'time', 'point', 'classroom', 'subject', 'teachers', 'info'];

        if (req.params.field) {
            if (fields.includes(req.params.field)) {
                syllabus[req.params.field] = req.body.new;
            }
            else {
                return res.status(400).send({ message: `field '${req.params.field}' does not exist or cannot be updated` });
            }
        }
        else {
            fields.forEach(field => {
                syllabus[field] = req.body.new[field];
            });
        }

        await syllabus.save();

        // update enrollments cascade
        const enrollments = await Enrollment(req.user.dbName).find({ 'syllabus._id': syllabus._id });
        const subSyllabus = {
            _id: syllabus._id,
            schoolId: syllabus.schoolId,
            schoolName: syllabus.schoolName,
            year: syllabus.year,
            term: syllabus.term,
            classTitle: syllabus.classTitle,
            time: syllabus.time,
            point: syllabus.point,
            subject: syllabus.subject
        }
        await Promise.all(
            enrollments.map(async (enrollment) => {
                enrollment['syllabus'] = subSyllabus;
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


