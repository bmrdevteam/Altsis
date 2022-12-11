const mongoose = require("mongoose");
const { conn } = require("../databases/connection");

const appsSchema = mongoose.Schema(
  {
    userId: String,
    userName: String,
    school: mongoose.Types.ObjectId,
    schoolId: String,
    schoolName: String,
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
