const mongoose = require('mongoose')
const moment = require('moment');
const { conn } = require('../databases/connection')

const syllabusSchema = mongoose.Schema({
    classTitle:String,
    userId:String,
    userName:String,
    schoolId:String,
    schoolName:String,
    schoolYear:String,
    seasonName:String,
    confirm:String,
    time:String,
    room:String,
    point:String,
    class:Array,
    teacher:Array,
    description: Object,
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports = (dbName) => {
    return conn[dbName].model('Syllabus', syllabusSchema);
}