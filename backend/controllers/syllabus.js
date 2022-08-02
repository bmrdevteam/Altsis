const User=require('../models/User')
const Syllabus = require("../models/Syllabus");

exports.create = async(req,res)=>{
    try {
        const _Syllabus=Syllabus(req.user.dbName);
        const syllabus = new _Syllabus(req.body);
        syllabus.userId=req.user.userId;
        syllabus.userName=req.user.name;
        await syllabus.save();
        return res.status(200).send({syllabus})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.list = async (req, res) => {
    try {
        const query={schoolId:req.query.schoolId};
        if(req.query.userId){
            query['userId']=req.query.userId;
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


