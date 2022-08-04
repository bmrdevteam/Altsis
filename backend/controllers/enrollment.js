const Enrollment = require("../models/Enrollment");
const Syllabus = require('../models/Syllabus');

exports.create = async(req,res)=>{
    try {
        const syllabus=await Syllabus(req.user.dbName).findById(req.params.syllabus_id);
        const _Enrollment=Enrollment(req.user.dbName);
        const enrollment=new _Enrollment({
            syllabus:req.params.syllabus_id
        })
        enrollment.userId=req.user.userId;
        enrollment.userName=req.user.userName;

        await enrollment.save();

        return res.status(200).send({enrollment})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.list = async (req, res) => {
    try {
        const enrollments = await Enrollment(req.user.dbName).find({userId:req.query.userId});
        return res.status(200).send({enrollments})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.updateEvaluation = async (req, res) => {
    try {
        // 권한 먼저 확인해야 함

        const enrollment=await Enrollment(req.user.dbName).findOne({_id:req.params._id});
        enrollment["evaluation"]=req.body.evaluation;
        await enrollment.save();
   
        return res.status(200).send({ enrollment })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await Enrollment(req.user.dbName).findByIdAndDelete(req.params._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


