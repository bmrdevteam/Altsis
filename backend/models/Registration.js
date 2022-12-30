const mongoose = require("mongoose");
const { conn } = require("../databases/connection");

const registrationSchema = mongoose.Schema({
  season: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  school: mongoose.Types.ObjectId,
  schoolId: String,
  schoolName: String,
  year: String,
  term: String,
  period: Object,
  userId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  grade: String,
  group: String,
  teacherId: String,
  teacherName: String,
  isActivated: {
    type: Boolean,
    default: true,
  },
});

registrationSchema.index({
  userId: 1,
});

registrationSchema.index(
  {
    season: 1,
    role: 1,
    userId: 1,
  },
  { unique: true }
);

module.exports = (dbName) => {
  return conn[dbName].model("Registration", registrationSchema);
};
