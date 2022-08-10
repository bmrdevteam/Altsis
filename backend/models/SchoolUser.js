const mongoose = require('mongoose')
const moment = require('moment');

var config = require('../config/config.js')

const { conn } = require('../databases/connection')

const registrationSchema=mongoose.Schema({
    year:String,
    terms:{
        type:[String],
        validate: v => Array.isArray(v) && v.length > 0,
    },
    info:mongoose.Schema({
        grade:String,
        group:String,
        number:Number,
        teacherId:String,
        teacherName:String
    }, { _id : false }),
}, { _id : false });

const schoolUserSchema = mongoose.Schema({
    schoolId: String,
    schoolName:String,
    userId: String,
    userName: String,
    role: String,
    photo:String,
    archive: Object,
    registrations: [registrationSchema],
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports = (dbName) => {
    return conn[dbName].model('SchoolUser', schoolUserSchema);
}