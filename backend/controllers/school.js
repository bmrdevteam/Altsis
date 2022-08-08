
const { checkSchema, validationResult } = require("express-validator");

const School = require("../models/School");

const schemaCreate ={
    "schoolId": {
        in: "body",
        isLength: {
            errorMessage: "schoolId length error",
            options: { min: 2, max: 20 }
        },
        isAlphanumeric: {
            errorMessage: "ID must be alphanumeric"
        }
    },
    "schoolName": {
        in: "body",
        isLength: {
            errorMessage: "schoolName length error",
            options: { min: 2, max: 20 }
        }
    }
}
exports.validateCreate=checkSchema(schemaCreate);

exports.create = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const _School = School(req.user.dbName);
        const school=new _School(req.body);
        await school.save()
        return res.status(200).send({ school});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
    
}


exports.list = async (req, res) => {
    try {
        const schools = await School(req.user.dbName).find({});
        return res.status(200).send({schools});
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.update = async (req, res) => {
    try {
        const updatedSchool=await School(req.user.dbName).findByIdAndUpdate(req.params._id,req.body,{ returnDocument: 'after' });
        return res.status(200).send({ school:updatedSchool})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await School(req.user.dbName).findByIdAndDelete(req.params._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}



exports.createClassroom = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        school["classrooms"].push(req.body.classroom);
        await school.save();
        return res.status(200).send({classrooms:school["classrooms"]})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.updateClassroom = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        if(school["classrooms"].length<=req.params.idx){
            return res.status(404).send({message:"index out of range"})
        }
        const old=school["classrooms"][req.params.idx];
        school["classrooms"][req.params.idx]=req.body.new;
        await school.save();
        return res.status(200).send({old:old,new:school["classrooms"][req.params.idx]});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.deleteClassroom = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        if(school["classrooms"].length<=req.params.idx){
            return res.status(404).send({message:"index out of range"})
        }
        const old=school["classrooms"][req.params.idx];
        school["classrooms"].splice(req.params.idx, 1);
        await school.save();
        return res.status(200).send({old:old})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}



exports.createSubject = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        school["subjects"].push(req.body.subject);
        await school.save();
        return res.status(200).send({subjects:school["subjects"]})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.updateSubject = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        if(school["subjects"].length<=req.params.idx){
            return res.status(404).send({message:"index out of range"})
        }
        const old=school["subjects"][req.params.idx];
        school["subjects"][req.params.idx]=req.body.new;
        await school.save();
        return res.status(200).send({old:old,new:school["subjects"][req.params.idx]});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.deleteSubject = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        if(school["subjects"].length<=req.params.idx){
            return res.status(404).send({message:"index out of range"})
        }
        const old=school["subjects"][req.params.idx];
        school["subjects"].splice(req.params.idx, 1);
        await school.save();
        return res.status(200).send({old:old})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


exports.createSeason = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        for(let key in req.body.season.permissions){
            req.body.season.permissions[key]["allowlist"]=[];
            req.body.season.permissions[key]["blocklist"]=[]
        }
        school["seasons"].push(req.body.season);
        await school.save();
        return res.status(200).send({seasons: school["seasons"]})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.updateSeason = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"})
        }
        if(school["seasons"].length<=req.params.idx){
            return res.status(404).send({message:"index out of range"})
        }
        const old=school["seasons"][req.params.idx];
        school["seasons"][req.params.idx]=req.body.new;
        await school.save();
        return res.status(200).send({old:old,new:school["seasons"][req.params.idx]});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.deleteSeason = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        if(school["seasons"].length<=req.params.idx){
            return res.status(404).send({message:"index out of range"})
        }
        const old=school["seasons"][req.params.idx];
        school["seasons"].splice(req.params.idx, 1);
        await school.save();
        return res.status(200).send({old:old})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


