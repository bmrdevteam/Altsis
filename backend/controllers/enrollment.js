const Enrollment = require("../models/Enrollment");
const Syllabus=require('../models/Syllabus');


const subSyllabus=(syllabus)=>
   ( {
        _id:syllabus._id,
        schoolId:syllabus.schoolId,
        schoolName:syllabus.schoolName,
        year:syllabus.year,
        term:syllabus.term,
        classTitle:syllabus.classTitle,
        time:syllabus.time,
        point:syllabus.point,
        subject:syllabus.subject
    })


exports.create = async(req,res)=>{
    try {
        const _Enrollment=Enrollment(req.user.dbName);
        const _enrollment=await _Enrollment.findOne({userId:req.user.userId,"syllabus._id":req.body.syllabus});
        if(_enrollment){
            return res.status(409).send({message:"you already enrolled in this syllabus"})
        }

        const _syllabus=await Syllabus(req.user.dbName).findById(req.body.syllabus);
        if(!_syllabus){
            return res.status(404).send({message:"invalid syllabus!"});
        }
        if(_syllabus['confirm']!='Y'){
            return res.status(409).send({message:"This course is not enrollable at the moment"});
        }


        const enrollment=new _Enrollment({
            userId:req.user.userId,
            userName:req.user.userName,
            syllabus:subSyllabus(_syllabus)
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
        
        const syllabus= subSyllabus(_syllabus);
        const userIds=(await Enrollment(req.user.dbName).find({"syllabus._id":syllabus._id})).map(enrollment=>enrollment.userId); //해당 수업을 듣는 학생들의 userId 리스트

        const enrollments=[];
        for(let student of req.body.students){
            if(userIds.includes(student.userId)){
                return res.status(409).send({message:`${student.userName}(${student.userId}) is already enrolled in this syllabus!`});
            }
            enrollments.push({
                userId:student.userId,
                userName:student.userName,
                syllabus
            });
        }
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
        if(!enrollment){
            return res.status(404).send({message:'no enrollment!'})
        }
        enrollment["evaluation"]=req.body.new;
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


