const mongoose=require('mongoose')
const conn=require('../databases/owner')   

const academySchema=mongoose.Schema({
    academyName:{
        type:String,
        unique:true
    },
    academyId:{
        type:String,
        unique:true
    },
    manager:String,
    email:String,
    tel:String,
    timestamps:{
        type:String,
        default:Date.now
    }
});

module.exports=conn.model('Academy',academySchema);