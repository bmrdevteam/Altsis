const User=require('../models/User')
const Syllabus = require("../models/Syllabus");

exports.create = async(req,res)=>{
    // userId, userName은 자동으로 넣자
    try {
        const _user=req.session.passport.user;
        const user=await User(_user.academy).findById(_user._id);
        const _Syllabus=Syllabus(_user.academy);
        const syllabus = new _Syllabus(req.body.syllabus);
        syllabus.userId=user.userId;
        syllabus.userName=user.name;
        await syllabus.save();
        return res.status(200).send({syllabus})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.read = async (req, res) => {
    try {
        const syllabus = await Syllabus(req.session.passport.user.academy).find(req.query);
        return res.status(200).send({syllabus})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        const syllabus=req.body.syllabus;
        const updatedSyllabus = await Syllabus(req.session.passport.user.academy).findByIdAndUpdate(syllabus._id, syllabus,{ returnDocument: 'after' });
        return res.status(200).send({ syllabus: updatedSyllabus })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await Syllabus(req.session.passport.user.academy).findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


