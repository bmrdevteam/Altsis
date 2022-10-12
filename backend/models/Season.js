const mongoose = require("mongoose");
const { conn } = require("../databases/connection");
const _ = require("lodash");

const subjectSchema = mongoose.Schema(
  {
    label: [String],
    data: Array,
  },
  { _id: false }
);

const seasonSchema = mongoose.Schema({
  schoolId: {
    type: String,
    required: true,
  },
  schoolName: {
    type: String,
    required: true,
  },
  classrooms: [String],
  subjects: subjectSchema,
  year: {
    type: String,
    required: true,
  },
  term: {
    type: String,
    required: true,
  },
  period: String,
  permissionSyllabus: [[String]],
  permissionEnrollment: [[String]],
  formTimetable: Object,
  formSyllabus: Object,
  formEvaluation: Object,
});

seasonSchema.index(
  {
    schoolId: 1,
    year: 1,
    term: 1,
  },
  { unique: true }
);

seasonSchema.methods.checkPermissionSyllabus = function (userId, role) {
  const permission = this.permissionSyllabus;
  for (let i = 0; i < permission?.length; i++) {
    if (permission[i][0] == "userId" && permission[i][1] == userId) {
      return permission[i][2];
    }
    if (permission[i][0] == "role" && permission[i][1] == role)
      return permission[i][2];
  }
  return false;
};

module.exports = (dbName) => {
  return conn[dbName].model("Season", seasonSchema);
};
