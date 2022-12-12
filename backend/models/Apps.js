const mongoose = require("mongoose");
const { conn } = require("../databases/connection");

const appsSchema = mongoose.Schema(
  {
    title: String,
    description: String,
  },
  { timestamps: true }
);

appsSchema.index(
  {
    title: 1,
  },
  { unique: true }
);

module.exports = (dbName) => {
  return conn[dbName].model("Apps", appsSchema);
};
