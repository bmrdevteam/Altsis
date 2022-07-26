const mongoose = require('mongoose')
const moment = require('moment');
const { conn } = require('../databases/connection')

const subjectSchema = mongoose.Schema({
    schoolId: String,
    subject:Array,
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports = (dbName) => {
    return conn[dbName].model('Subject', subjectSchema);
}