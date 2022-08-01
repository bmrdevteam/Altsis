const mongoose=require('mongoose')
const moment=require('moment')
const {conn}=require('../databases/connection')   

const schoolSchema=mongoose.Schema({
    schoolId:{
        type:String,
        unique:true
    },
    schoolName:String,
    logo:String,
    head:String,
    tel:String,
    email:String,
    address:String,
    homepage:String,
    classrooms:Array,
    subjects:Array,
    seasons:Array,
    timestamps:{
        type:String,
        default:moment().format('YYYY-MM-DD HH:mm:ss')
    },
});

module.exports=(dbName)=>{
    return conn[dbName].model('School',schoolSchema);
}