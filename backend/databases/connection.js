const mongoose=require('mongoose')
const config=require('../config/config')
const owner=require('./owner')
const Academy=require('../models/Academy')

const conn={"owner":owner};

Academy.find({},(err,academies)=>{
    academies.forEach(academy => {
        conn[academy["academyId"]]=mongoose.createConnection(config["newUrl"](academy["academyId"]))
    });
})

exports.addConnection=({academyId,newConn})=>{
    conn[academyId]=newConn;
    console.log('coonection is added');
}

exports.deleteConnection=(academyId)=>{
    delete conn[academyId];
    console.log('coonection is deleted');
}

exports.conn =conn
