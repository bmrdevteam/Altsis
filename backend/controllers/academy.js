const mongoose=require('mongoose');
const config=require('../config/config')
const {conn,addConnection,deleteConnection}=require('../databases/connection')   
const Academy = require("../models/Academy");
const { checkSchema, validationResult } = require("express-validator");
const User = require('../models/User');

const schemaCreate={
    "email": {
        in: "body",
        isEmail: {
            errorMessage: "invalid email"
        }
    },
    "tel": {
        in: "body"
    },
    "adminId": {
        in: "body",
        isLength: {
            errorMessage: "ID length error",
            options: { min: 4, max: 20 }
        },
        isAlphanumeric: {
            errorMessage: "ID must be alphanumeric"
        }
        
    },
    "adminName": {
        in: "body",
        isLength: {
            errorMessage: "userName length error",
            options: { min: 2, max: 20 }
        }
    },
}
const schemaUpdate={
    "email": {
        in: "body",
        isEmail: {
            errorMessage: "invalid email"
        },
        optional:true
    },
    "tel": {
        in: "body",
        optional:true
    },
    "adminId": {
        in: "body",
        optional:true,
        isLength: {
            errorMessage: "ID length error",
            options: { min: 4, max: 20 }
        },
        isAlphanumeric: {
            errorMessage: "ID must be alphanumeric"
        }
        
    },
    "adminName": {
        in: "body",
        optional:true,
        isLength: {
            errorMessage: "userName length error",
            options: { min: 2, max: 20 }
        }
    }
}
exports.validateCreate=checkSchema(schemaCreate);
exports.validateUpdate = checkSchema(schemaUpdate);

exports.create = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // check duplication
        const academyId=req.body.academyId;
        const _academy = await Academy.findOne( {$or:[ {academyId:academyId},{adminId:req.body.adminId} ]});
        if(_academy){
            if(_academy.academyId==academyId){
                return res.status(400).send({message:`academyId is already in use`})
            }
            else{
                return res.status(400).send({message:`adminId is already in use`})
            }
        }

        // create academy document
        const academy  = new Academy(req.body);
        await academy.save();

        // create academy DB
        const dbName=academyId+'-db'
        const newConn=mongoose.createConnection(config["url"](dbName))
        addConnection({dbName,newConn});

        // generate random password
        var chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let password=''
        for (var i = 0; i < 12; i++) {
            var randomNumber = Math.floor(Math.random() * chars.length);
            password += chars[randomNumber];
        }

        // create admin document
        const _User=User(dbName);
        const admin=new _User({userId:academy.adminId, userName:academy.adminName,password:password,auth:'admin'});
        await admin.save();

        return res.status(200).send({ academy,admin:{
            _id:admin._id,
            admin:admin.userId,
            userName:admin.userName,
            password:password,
            auth:admin.auth
        }});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


exports.list = async (req, res) => {
    try {
        const academies = await Academy.find({});
        return res.status(200).send({academies})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const academy=await Academy.findById(req.params._id);
        if(!academy){
            return res.status(404).send({message: "no academy!"})
        }

        const fields=['email','tel','adminId','adminName'];

        if(req.params.field){
            if(fields.includes(req.params.field)){
                academy[req.params.field]=req.body.new;
            }
            {
                return res.status(400).send({message:`field '${req.params.field}' does not exist or cannot be updated`});
            }
        }
        else{
            fields.forEach(field => {
                academy[field]=req.body.new[field];
            });
        }
        
       await academy.save();
        return res.status(200).send({academy})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.delete = async (req, res) => {
    try {
        const academy=await Academy.findById(req.params._id);
        if(!academy){
            return res.status(404).send({message:"no academy!"});
        }
        academy.remove();
        const dbName=academy.academyId+'-db'
        await conn[dbName].db.dropDatabase();
        deleteConnection(dbName);
        return res.status(200).send({success:true})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}
