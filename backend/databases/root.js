const mongoose = require("mongoose");

module.exports = mongoose.createConnection(
  `${process.env["DB_URL"]}/root?retryWrites=true&w=majority`
);
