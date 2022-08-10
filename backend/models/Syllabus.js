const mongoose = require('mongoose')
const moment = require('moment');
const { conn } = require('../databases/connection')

const syllabusSchema = mongoose.Schema({
    classTitle:{
        type:String,
        required:true
    },
    userId:{
        type:String,
        required:true
    },
    userName:{
        type:String,
        required:true
    },
    schoolId:{
        type:String,
        required:true
    },
    schoolName:{
        type:String,
        required:true
    },
    year:{
        type:String,
        required:true
    },
    term:{
        type:String,
        required:true
    },
    confirmed:{
        type:Boolean,
        default:false
    },
    time:{
        type:[
            mongoose.Schema({
                label:{
                    type:String,
                    required:true
                },
                start:{
                    type:String,
                    required:true
                },
                end:{
                    type:String,
                    required:true
                }
            },{_id:false})],
            validate: v => Array.isArray(v) && v.length > 0,
        required:true
    },
    classroom:String,
    point:{
        type:Number,
        default:0
    },
    subject:{
        type:Array,
        required:true
    },
    teachers:{
        type:[
            mongoose.Schema({
                userId:{
                    type:String,
                    required:true
                },
                userName:{
                    type:String,
                    required:true
                }
            },{_id:false})],
        validate: v => Array.isArray(v) && v.length > 0,
        required:true
        },
    info: Object
},{ timestamps: true });

module.exports = (dbName) => {
    return conn[dbName].model('Syllabus', syllabusSchema);
}