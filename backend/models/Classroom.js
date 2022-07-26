const mongoose = require('mongoose')
const moment = require('moment');
const { conn } = require('../databases/connection')

const classroomSchema = mongoose.Schema({
    name: String,
    schoolId:String,
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

classroomSchema.index({ name: 1, schoolId: 1 }, { unique: true }); 

module.exports = (dbName) => {
    return conn[dbName].model('Classroom', classroomSchema);
}