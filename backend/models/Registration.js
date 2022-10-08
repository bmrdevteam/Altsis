const mongoose = require("mongoose");
const { conn } = require("../databases/connection");

const registrationSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  schoolId: {
    type: String,
    required: true,
  },
  schoolName: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  term: {
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
});

registrationSchema.index({
  userId: 1,
});

registrationSchema.index(
  {
    schoolId: 1,
    year: 1,
    term: 1,
    userId: 1,
  },
  { unique: true }
);

module.exports = (dbName) => {
  return conn[dbName].model("Registration", registrationSchema);
};
