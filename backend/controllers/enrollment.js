const Enrollment = require("../models/Enrollment");
const Syllabus=require('../models/Syllabus');

exports.create = async(req,res)=>{
    try {
        const _syllabus=await Syllabus(req.user.dbName).findById(req.body.syllabus);
        if(!_syllabus){
            return res.status(404).send({message:"invalid syllabus!"});
        }
        if(_syllabus['confirm']!='Y'){
            return res.status(409).send({message:"This course is not enrollable at the moment"});
        }
        const _Enrollment=Enrollment(req.user.dbName);
        const enrollment=new _Enrollment({
            userId:req.user.userId,
            userName:req.user.userName,
            syllabus:{
                _id:_syllabus._id,
                schoolId:_syllabus.schoolId,
                schoolName:_syllabus.schoolName,
                year:_syllabus.year,
                term:_syllabus.term,
                classTitle:_syllabus.classTitle,
                time:_syllabus.time,
                point:_syllabus.point,
                subject:_syllabus.subject
            }
        })
        await enrollment.save();
        return res.status(200).send({enrollment})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.createBulk = async(req,res)=>{
    try {
        const _syllabus=await Syllabus(req.user.dbName).findById(req.body.syllabus);
        if(!_syllabus){
            return res.status(404).send({message:"invalid syllabus!"});
        }
        if(_syllabus['confirm']!='Y'){
            return res.status(409).send({message:"This course is not enrollable at the moment"});
        }
        
        const syllabus= {
            _id:_syllabus._id,
            schoolId:_syllabus.schoolId,
            schoolName:_syllabus.schoolName,
            year:_syllabus.year,
            term:_syllabus.term,
            classTitle:_syllabus.classTitle,
            time:_syllabus.time,
            point:_syllabus.point,
            subject:_syllabus.subject
        }

        const enrollments=req.body.students.map((student)=>{
            return{
                userId:student.userId,
                userName:student.userName,
                syllabus
            }
        })

        const newEnrollments=await Enrollment(req.user.dbName).insertMany(enrollments);
        return res.status(200).send({enrollment:newEnrollments});
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.list = async (req, res) => {
    try {
        const enrollments = await Enrollment(req.user.dbName).find({
            userId:req.query.userId,
            "syllabus.year":req.query.year,
            "syllabus.term":req.query.term,
            "syllabus.schoolId":req.query.schoolId,
        });
        return res.status(200).send({enrollments:enrollments.map((enrollment)=>{
            console.log(enrollment['syllabus']['classTitle']);
            return {
                classTitle:enrollment['syllabus']['classTitle'],
                time:enrollment['syllabus']['time'],
                point:enrollment['syllabus']['point'],
                subject:enrollment['syllabus']['subject'],
            }
        })})
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


