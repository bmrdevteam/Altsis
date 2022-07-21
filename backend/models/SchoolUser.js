const mongoose = require('mongoose')
const moment = require('moment');

var config = require('../config/config.js')

const { conn } = require('../databases/connection')

const schoolUserSchema = mongoose.Schema({
    schoolId: String,
    userId: String,
    userName: String,
    userEmail: String,
    role: String,
    info: {
        type: String,
        get: function (data) {
            try {
                return JSON.parse(data);
            } catch (error) {
                return data;
            }
        },
        set: function (data) {
            return JSON.stringify(data);
        }
    },
    parents: Array,
    season: Array,
    timestamps: {
        type: String,
        default: moment().format('YYYY-MM-DD HH:mm:ss')
    }
});

module.exports = (dbName) => {
    return conn[dbName].model('SchoolUser', schoolUserSchema);
}