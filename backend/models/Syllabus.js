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
    confirm:{
        type:String,
        default:'N'
    },
    time:{
        type:String,
        required:true
    },
    classroom:String,
    point:{
        type:String,
        default:'0'
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
    info: Object,
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports = (dbName) => {
    return conn[dbName].model('Syllabus', syllabusSchema);
}