const mongoose = require("mongoose");
const config = require("../config/config");

module.exports = mongoose.createConnection(config["url"]("root"));
