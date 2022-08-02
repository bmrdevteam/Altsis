const mongoose = require('mongoose')
const moment = require('moment');
const { conn } = require('../databases/connection')

const syllabusSchema = mongoose.Schema({
    classTitle:String,
    userId:String,
    userName:String,
    schoolId:String,
    schoolName:String,
    year:String,
    term:String,
    confirm:String,
    time:String,
    classroom:String,
    point:String,
    subject:Array,
    teachers:Array,
    description: Object,
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports = (dbName) => {
    return conn[dbName].model('Syllabus', syllabusSchema);
}