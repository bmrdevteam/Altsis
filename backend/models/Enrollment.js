const mongoose = require('mongoose')
const moment = require('moment');
const { conn } = require('../databases/connection')

const enrollmentSchema = mongoose.Schema({
    userId: String,
    userName:String,
    schoolId:String,
    year:String,
    term:String,
    syllabus:Object,
    evaluation:Object,
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports = (dbName) => {
    return conn[dbName].model('Enrollment', enrollmentSchema);
}