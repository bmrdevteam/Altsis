const { prodLogger } = require("./prodLogger");
const { devLogger } = require("./devLogger");

module.exports = {
  logger: process.env.NODE_ENV === "production" ? prodLogger : devLogger,
};
