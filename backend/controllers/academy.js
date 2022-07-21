const mongoose=require('mongoose');
const config=require('../config/config')
const {conn,addConnection,deleteConnection}=require('../databases/connection')   
const Academy = require("../models/Academy");
const User=require('../models/User');

exports.create = async (req, res) => {

    try {
        const academyId=req.body.academyId;

        // create academy document
        const academy  = new Academy(req.body);
        await academy.save();

        // create academy DB
        const newConn=mongoose.createConnection(config["newUrl"](academyId))
        addConnection({academyId,newConn});

        // save admin in academy DB
        const _User=User(academyId);
        const admin=new _User(req.body.admin);
        await admin.save();

        return res.status(200).send({ academy,admin});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
    
}


exports.read = async (req, res) => {
    try {
        let dbQuery = req.query;
        const academy = await Academy.find(dbQuery);
        if (academy.length == 0) return res.status(404).send({ message: "no academy!" })
        return res.status(200).send({academy})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        const academy=req.body.academy[0];
        const updatedAcademy = await Academy.findByIdAndUpdate(academy._id, academy,{ returnDocument: 'after' });
        return res.status(200).send({ academy: updatedAcademy })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.delete = async (req, res) => {
    try {
        const academy=await Academy.findById(req.query._id);
        if(!academy){
            return res.status(404).send({message:"no academy!"});
        }
        academy.remove();
        await conn[academy.academyId].db.dropDatabase();
        deleteConnection(academy.academyId);
        return res.status(200).send({success:true})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


