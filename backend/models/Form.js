const mongoose = require('mongoose')
const moment = require('moment');
const { conn } = require('../databases/connection')

const formSchema = mongoose.Schema(
    {
        userId: String,
        userName: String,
        type:String,
        title:{
            type:String,
            unique:true
        },
        data: Object,
        timestamps: {
            type: String,
            default: moment().format('YYYY-MM-DD HH:mm:ss')
        }
    })

module.exports = (dbName) => {
    return conn[dbName].model('Form', formSchema);
}