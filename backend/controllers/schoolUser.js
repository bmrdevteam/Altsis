const SchoolUser = require("../models/SchoolUser");
const lodash=require('lodash');
const mongoose=require('mongoose');

exports.register= async (req,res) => {
    try {
        const schoolUser = await SchoolUser(req.user.dbName).findById(mongoose.Types.ObjectId(req.body._id));
        if(!schoolUser){
            res.status(404).send({message:"no schoolUser!"});
        }
        const idx = schoolUser["registrations"].findIndex(obj => obj.year.year === req.body.year.year);
        if(idx==-1){
            schoolUser["registrations"].push({
                year: req.body.year,
                terms:[
                    req.body.term
                ]
            })
        }
        else{
            schoolUser["registrations"][idx]['terms'].push(req.body.term);
            schoolUser.markModified('registrations');
        } 
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
                    throw new Error("no schooluser with _id "+_schoolUser._id);
                }
                console.log('debug: schoolUser.userId: ',schoolUser.userId);
                const idx = schoolUser["registrations"].findIndex(obj => obj.year.year === _schoolUser.year.year);
                if(idx==-1){
                    schoolUser["registrations"].push({
                        year: _schoolUser.year,
                        terms:[
                            _schoolUser.term
                        ]
                    })
                }
                else{
                    schoolUser["registrations"][idx]['terms'].push(_schoolUser.term);
                    schoolUser.markModified('registrations');
                } 
                return schoolUser;
            })
        );
       await Promise.all(
            schoolUsers.map(async schoolUser=>{
                await schoolUser.save();
                console.log(`debug: schoolUser.userId(${schoolUser.userId}) is saved`);
            })
       )
        return res.status(200).send(schoolUsers);
    }
    catch (err) {
        console.log('catched?');
        return res.status(500).send({ err: err.message });
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
        const schoolUser = await SchoolUser(req.user.dbName).findById(req.body._id);
        const yearIdx = schoolUser["registrations"].findIndex(obj => obj.year.year === req.body.year.year);
        if(yearIdx==-1){
            return res.status(404).send({message:"not existing..."});
            
        }
        else{
            schoolUser["registrations"][yearIdx]=req.body.year;
            const termIdx=schoolUser["registrations"][yearIdx]['terms'].findIndex(obj => obj.term.term === req.body.term.term);
            schoolUser["registrations"][yearIdx]['terms'][termIdx]=req.body.term;
            schoolUser.markModified('registrations');
        } 
        await schoolUser.save();
        return res.status(200).send({schoolUser})
      }
      catch (err) {
          if (err) return res.status(500).send({ err: err.message });
      }
  }

exports.update=async(req,res)=>{
  try {
        const schoolUser=await SchoolUser(req.user.dbName).findById(req.params._id);
        const fields=['role','photo','info']
        if(fields.includes(req.params.field)){
            schoolUser[req.params.field]=req.body.new;
        }
        else if(req.params.field=='registration'){
            console.log('...')
            const yearIdx = schoolUser["registrations"].findIndex(obj => obj.year.year === req.body.year.year);
            if(yearIdx==-1){
                return res.status(404).send({message:"not existing..."});
            }
            
            schoolUser["registrations"][yearIdx]['year']=req.body.year;
            console.log(schoolUser["registrations"][yearIdx]) 
            const termIdx=schoolUser["registrations"][yearIdx]['terms'].findIndex(obj => obj.term === req.body.term.term);
            if(termIdx==-1){
                return res.status(404).send({message:"not existing..."});
            }
            schoolUser["registrations"][yearIdx]['terms'][termIdx]=req.body.term;
            schoolUser.markModified('registrations');
        }
        else{
            return res.status(400).send({message:`field '${req.params.field}' does not exist or cannot be updated`});
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