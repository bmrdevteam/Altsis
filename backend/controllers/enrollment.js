const Enrollment = require("../models/Enrollment");

exports.create = async(req,res)=>{
    try {
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
        const enrollments = await Enrollment(req.user.dbName).find({userId:req.user.userId});
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


