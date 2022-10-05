const mongoose = require("mongoose");

module.exports = mongoose.createConnection(
  `${process.env["DB_URL"].trim()}/root?retryWrites=true&w=majority`
);
