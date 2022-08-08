const User=require('../models/User')
const Syllabus = require("../models/Syllabus");
const Enrollments=require('../models/Enrollment');
const School=require('../models/School');
const SchoolUser = require('../models/SchoolUser');
const { user } = require('../databases/root');

exports.create = async(req,res)=>{
    try {
        // 1. find school
        const school=await School(req.user.dbName).findOne({schoolId:req.body.schoolId});
        if(!school){
            return res.status(404).send({message:"not existing school..."});
        }

        // 2. check if season is activated
        const idx= school["seasons"].findIndex(obj=>(obj.year===req.body.year)&&(obj.term===req.body.term));
        if(idx==-1){
            return res.status(404).send({message:"not existing season..."});
        }
        if(school["seasons"][idx]["activated"]=='N'){
            return res.status(409).send({message:"season is not activated..."});
        }

        // 3. check if user is registered in requrested season
        const schoolUser=await SchoolUser(req.user.dbName).findOne({userId:req.user.userId});
        const idxYear=schoolUser["registrations"].findIndex(obj=>(obj.year.year===req.body.year));
        if(idxYear==-1){
            return res.status(409).send({message:"you are not registered in this year"});
        }
        const idxTerm=schoolUser["registrations"][idxYear]["terms"].findIndex(obj=>(obj.term===req.body.term));
        if(idxTerm==-1){
            return res.status(409).send({message:"you are not registered in this term"});
        }

        // 4. check if user's role has permission
        const permission=school["seasons"][idx]["permissions"]["syllabus"];
        if((permission[schoolUser.role]=='Y'
            &&permission["blocklist"].some(e=>e.userId===req.user.userId))
            ||
            (permission[schoolUser.role]=='N'
            &&!permission["allowlist"].some(e=>e.userId===req.user.userId))){
            return res.status(200).send({message:'you have no permission!'});
        }

        const _Syllabus=Syllabus(req.user.dbName);
        const syllabus = new _Syllabus(req.body);
        syllabus.userId=req.user.userId;
        syllabus.userName=req.user.userName;
        await syllabus.save();
        return res.status(200).send({syllabus})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.list = async (req, res) => {
    try {
        const query={
            schoolId:req.query.schoolId,
            year:req.query.year,
            term:req.query.term
        };
        if(req.query.userId){
            query['userId']=req.query.userId;
        }
        if(req.query.teacherId){
            query['teachers.userId']=req.query.teacherId;
        }

        const syllabuses = await Syllabus(req.user.dbName).find(query);
        return res.status(200).send({syllabuses})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.read = async (req, res) => {
    try {
        const syllabus = await Syllabus(req.user.dbName).findOne({_id:req.params._id});
        return res.status(200).send({syllabus})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.students = async (req, res) => {
    try {
        const syllabus = await Syllabus(req.user.dbName).findOne({_id:req.params._id});
        if(!syllabus){
            return res.status(404).send({message:"no syllabus!"});
        }
        const students=await Enrollments(req.user.dbName).find({"syllabus._id":syllabus._id});
        return res.status(200).send({students:students.map((student)=>{
            return {
                userId:student.userId,
                userName:student.userName
            }})});
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        // authentication
        const syllabus=await Syllabus(req.user.dbName).findOne({_id:req.params._id});
        if(req.user.userId!=syllabus.userId){
            return res.status(403).send({message:"you cannot update this syllabus"})
        };

        // 수정이 가능한 시즌인지도 확인해야 함. confirm인가?
        // 어떤게 수정 가능한 필드지?
        const fields=['classTitle','confirm','time','point','classroom','subject','teachers','description']
        //    classTitle:String, time:String, point:String,subject:Array
        for(let field of fields){
            if(req.body[field]){
                syllabus[field]=req.body[field];
            }
            
        }
        await syllabus.save();

        return res.status(200).send({ syllabus})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await Syllabus(req.user.dbName).findByIdAndDelete(req.params._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


