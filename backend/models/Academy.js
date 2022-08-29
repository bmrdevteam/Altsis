const mongoose = require("mongoose");
const moment = require("moment");
const conn = require("../databases/root");

const academySchema = mongoose.Schema(
    {
        academyId: {
            type: String,
            unique: true
        },
        academyName: String,
        email: String,
        tel: String,
        adminId: String,
        adminName: String
    },
    { timestamps: true }
);

module.exports = conn.model("Academy", academySchema);
