const mongoose=require('mongoose')
const conn=require('../databases/connection')   

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
        default:Date.now
    }
    
});

module.exports=(dbName)=>{
    return conn[dbName].model('School',schoolSchema);
}