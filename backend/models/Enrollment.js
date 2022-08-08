const mongoose = require('mongoose')
const moment = require('moment');
const { conn } = require('../databases/connection')

var syllabusSchema =  mongoose.Schema({
    schoolId:String,
    schoolName:String,
    year:String,
    term:String,
    classTitle:String,
    time:String,
    point:String,
    subject:Array
});


const enrollmentSchema = mongoose.Schema({
    userId: String,
    userName:String,
    schoolId:String,
    year:String,
    term:String,
    syllabus:syllabusSchema,
    evaluation:Object,
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports = (dbName) => {
    return conn[dbName].model('Enrollment', enrollmentSchema);
}