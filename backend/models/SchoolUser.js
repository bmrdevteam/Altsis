const mongoose = require('mongoose')
const moment = require('moment');

var config = require('../config/config.js')

const { conn } = require('../databases/connection')

const schoolUserSchema = mongoose.Schema({
    schoolId: String,
    schoolName:String,
    userId: String,
    userName: String,
    profile:String,
    role: String,
    archive: Object,
    registrations: Array,
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports = (dbName) => {
    return conn[dbName].model('SchoolUser', schoolUserSchema);
}