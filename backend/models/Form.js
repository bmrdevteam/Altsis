const mongoose = require('mongoose')
const moment = require('moment');
const { conn } = require('../databases/connection')

const formSchema = mongoose.Schema(
    {
        userId: String,
        userName: String,
        schoolId: String,
        type:String,
        title:String,
        data: Object,
        timestamps: {
            type: String,
            default: moment().format('YYYY-MM-DD HH:mm:ss')
        }
    })

module.exports = (dbName) => {
    return conn[dbName].model('Form', formSchema);
}