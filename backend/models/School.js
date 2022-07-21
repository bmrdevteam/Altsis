const mongoose=require('mongoose')
const moment=require('moment')
const {conn}=require('../databases/connection')   

const schoolSchema=mongoose.Schema({
    adminId:String,
    schoolName:{
        type:String,
        unique:true
    },
    schoolId:{
        type:String,
        unique:true
    },
    schoolLogo:String,
    head:String,
    tel:String,
    address:String,
    homepage:String,
    timestamps:{
        type:String,
        default:moment().format('YYYY-MM-DD HH:mm:ss')
    },
});

module.exports=(dbName)=>{
    return conn[dbName].model('School',schoolSchema);
}