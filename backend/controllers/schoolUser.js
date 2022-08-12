const SchoolUser = require("../models/SchoolUser");
const lodash=require('lodash');
const mongoose=require('mongoose');
const createError = require('http-errors');

exports.register= async (req,res) => {
    try {
        const schoolUser = await SchoolUser(req.user.dbName).findById(mongoose.Types.ObjectId(req.body._id));
        if(!schoolUser){
            res.status(404).send({message:"no schoolUser!"});
        }
        const yearIdx = schoolUser["registrations"].findIndex(obj => obj.year === req.body.year);
        if(yearIdx==-1){
            schoolUser["registrations"].push({
                year: req.body.year,
                terms:[
                    req.body.term
                ],
                info:req.body.info
            })
        }
        else{
            const termIdx= schoolUser["registrations"][yearIdx]['terms'].findIndex(obj => obj === req.body.term);
            if(termIdx==-1){
                schoolUser["registrations"][yearIdx]['terms'].push(req.body.term);
            }
            else{
               return res.status(409).send({message:'schoolUser already registered in this term'});
            } 
        }
        schoolUser.markModified('registrations');
        await schoolUser.save();
        return res.status(200).send({schoolUser})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.registerBulk= async (req,res) => {
    try {

        const schoolUsers=await Promise.all(
            req.body.schoolUsers.map(async _schoolUser=>{
                const schoolUser = await SchoolUser(req.user.dbName).findById(mongoose.Types.ObjectId(_schoolUser._id));
                if(!schoolUser){
                    const error=new Error(`no schooluser(_id:${_schoolUser._id}`);
                    error.code=404;
                    throw error;
                }
                console.log('debug: schoolUser.userId: ',schoolUser.userId);
                const yearIdx = schoolUser["registrations"].findIndex(obj => obj.year === _schoolUser.year);
                if(yearIdx==-1){
                    schoolUser["registrations"].push({
                        year: _schoolUser.year,
                        terms:[
                            _schoolUser.term
                        ],
                        info:_schoolUser.info
                    })
                }
                else{
                    const termIdx= schoolUser["registrations"][yearIdx]['terms'].findIndex(obj => obj === _schoolUser.term);
                    if(termIdx==-1){
                        schoolUser["registrations"][yearIdx]['terms'].push(_schoolUser.term);
                    }
                    else{
                        const error=new Error('schoolUser already registered in this term');
                        error.code=409;
                        throw error;
                    } 
                 }
                return schoolUser;
            })
        );
       await Promise.all(
            schoolUsers.map(schoolUser=>{
                schoolUser.save();
                console.log(`debug: schoolUser.userId(${schoolUser.userId}) is saved`);
            })
       )
        return res.status(200).send(schoolUsers);
    }
    catch (err) {
        return res.status(err.code||500).send({ err: err.message });
    }
}


exports.read=async(req,res)=>{
    try {
        const schoolUser = await SchoolUser(req.user.dbName).findById(req.params._id);
        return res.status(200).send({schoolUser})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.list=async(req,res)=>{
    try {
        const schoolUsers = await SchoolUser(req.user.dbName).find({});
        return res.status(200).send({schoolUsers})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

exports.updateRegistration=async(req,res)=>{
    try {
        const schoolUser = await SchoolUser(req.user.dbName).findById(req.params._id);
        if(!schoolUser){
            return res.status(404).send({message:'no schoolUser!'});
        }

        // update every registration
        if(!req.params.yearIdx){
            schoolUser['registrations']=req.body.new;
        }
        else if(schoolUser['registrations'].length<req.params.yearIdx){
            return res.status(409).send({message:'index out of range'});
        }
        else{
             // update year Info
             schoolUser['registrations'][req.params.yearIdx]=req.body.new;
        }
        await schoolUser.save();
        return res.status(200).send({schoolUser});
      }
      catch (err) {
          if (err) return res.status(500).send({ err: err.message });
      }
  }

exports.update=async(req,res)=>{
  try {
        const schoolUser=await SchoolUser(req.user.dbName).findById(req.params._id);
        if(!schoolUser){
            return res.status(404).send({message:"no schooluser!"});
        }

        const fields=['role','photo','archive'];
        if(req.params.field){
            if(fields.includes(req.params.field)){
                schoolUser[req.params.field]=req.body.new;
            }
            else{
                return res.status(400).send({message:`field '${req.params.field}' does not exist or cannot be updated`});
            }
        }
        else{
            fields.forEach(field => {
                schoolUser[field]=req.body.new[field];
            });
        }
    
        await schoolUser.save();
        return res.status(200).send({schoolUser})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.deleteRegistration=async(req,res)=>{
    try {
        const schoolUser=await SchoolUser(req.user.dbName).findById(req.params._id);
        const yearIdx = schoolUser["registrations"].findIndex(obj => obj.year.year === req.query.year);
        if(yearIdx==-1){
            return res.status(404).send({message:"not existing year"});
        }
        const termIdx=schoolUser["registrations"][yearIdx]['terms'].findIndex(obj => obj.term === req.query.term);
        if(termIdx==-1){
            return res.status(404).send({message:"not existing term"});
        }
        else if(termIdx==0){
            schoolUser["registrations"].splice(yearIdx, 1);
        }
        else{
            schoolUser["registrations"][yearIdx]['terms'].splice(termIdx, 1);
        }
        schoolUser.markModified('registrations');
        await schoolUser.save();
        return res.status(200).send({schoolUser})
      }
      catch (err) {
          if (err) return res.status(500).send({ err: err.message });
      }
  }