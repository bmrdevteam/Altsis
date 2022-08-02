const mongoose = require('mongoose')
const moment = require('moment');
const { conn } = require('../databases/connection')

const enrollmentSchema = mongoose.Schema({
    userId: String,
    userName:String,
    syllabus:String,
    evaluation:Object,
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports = (dbName) => {
    return conn[dbName].model('Enrollment', enrollmentSchema);
}