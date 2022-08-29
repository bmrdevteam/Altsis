const _ = require('lodash');
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
exports.classrooms = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findById(req.params._id);
        if(!school){
            return res.status(404);
        }
        return res.status(200).send({classrooms:school.classrooms});
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}
exports.subjects = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findById(req.params._id);
        if(!school){
            return res.status(404);
        }
        return res.status(200).send({classrooms:school.subjects});
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        const school=await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:'no school!'});
        }

        const fields=['logo','tel','email','head','homepage','address'];
        

        if(req.params.field){
            if(fields.includes(req.params.field)){
                school[req.params.field]=req.body.new;
            }
            else{
                return res.status(400).send({message:`field '${req.params.field}' does not exist or cannot be updated`});
            }
        }
        else{
            fields.forEach(field => {
                school[field]=req.body.new[field];
            });
        }
        await school.save();
        return res.status(200).send({ school})
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

exports.createField = async (req, res) => {
    try {
        const fields=['classrooms','subjects','seasons'];
        if(!fields.includes(req.params.field)){
            return res.status(400).send({message:`field '${req.params.field}' does not exist or cannot be updated`});
        }

        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        if(_.isEmpty(req.body.new)){
            return res.status(409).send({message:'body.new is null or empty!'});
        }

        if(req.params.field=='subjects'){
            school[req.params.field]['data'].push(req.body.new);
        }
        else{
            if(req.params.field=='classrooms'&&_.indexOf(school['classrooms'],req.body.new)!=-1){
                return res.status(409).send({message:'already existing classroom'});
            }
            school[req.params.field].push(req.body.new);
        }

        school.markModified(req.params.field);
        await school.save();
        return res.status(200).send({school})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.updateField = async (req, res) => {
    try {
        
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        
        school[req.params.field]=req.body.new;
        school.markModified(req.params.field);
        await school.save();
        return res.status(200).send({school});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.updateFieldByIdx = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }

        if(school[req.params.field].length<req.params.idx){
            return res.status(409).send({message:"index out of range"})
        }
        if(req.params.field=='subjects'){
            school[req.params.field]['data'][req.params.idx]=req.body.new;
        }
        else{
            school[req.params.field][req.params.idx]=req.body.new;
        }
        school.markModified(req.params.field);
        await school.save();
        return res.status(200).send({school});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.deleteFieldByIdx = async (req, res) => {
    try {
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        if(req.params.field=='subjects'){
            school[req.params.field]['data'].splice(req.params.idx, 1);
        }
        else{
            school[req.params.field].splice(req.params.idx, 1);
        }
        
        await school.save();
        return res.status(200).send({school})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}




exports.updateSettings = async (req, res) => {
    try {
        
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }
        
        school['settings']=req.body.new;
        school.markModified(req.params.field);
        await school.save();
        return res.status(200).send({school});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.readSettings = async (req, res) => {
    try {
        
        const school = await School(req.user.dbName).findOne({_id:req.params._id});
        if(!school){
            return res.status(404).send({message:"no school!"});
        }

        return res.status(200).send({settings: school['settings']});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}