const mongoose = require('mongoose')
const moment = require('moment');
const { conn } = require('../databases/connection')

const seasonSchema = mongoose.Schema({
    schoolId: String,
    year:String,
    term:String,
    period:String,
    activate:String,
    permission:Object,
    form:Object,
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports = (dbName) => {
    return conn[dbName].model('Season', seasonSchema);
}