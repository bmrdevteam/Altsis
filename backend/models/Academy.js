const mongoose=require('mongoose')
const moment=require('moment')
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
        default:moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports=conn.model('Academy',academySchema);