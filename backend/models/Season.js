const mongoose = require("mongoose");
const { conn } = require("../databases/connection");

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

module.exports = (dbName) => {
  return conn[dbName].model("Season", seasonSchema);
};
